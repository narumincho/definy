import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { useRouter } from "@void/react";
import type {
  AccountState,
  ConnectionStatus,
  EventRecord,
  LanguageCode,
  ModulePartSnapshot,
  ModuleSnapshot,
  PartChange,
  PartSnapshot,
  WorkingChanges,
} from "./types.ts";
import {
  base64ToBytes,
  bytesToUrlSafeBase64NoPad,
  deriveModuleIdBytesSync,
  deriveModulePartIdSync,
  extractCreateAccount,
  extractModuleCommit,
  type DecodedPart,
} from "./cbor.ts";
import {
  checkModuleCommitParts,
  checkParts,
  createTypeCheckSession,
  outcomeErrorMessage,
  typeEnvFromParts,
  typeEnvKey,
  type LatestPart,
  type SelfHostedTypeCheckOutcome,
} from "./self_hosted_type_check.ts";
import { loadTypeChecker } from "./type_checker_browser.ts";
import { pickLatestCommitPerModule } from "./latest_commits.ts";
import {
  generateAccountCredentials,
  importAccountCredentials,
  createSignedAccountEvent,
  createSignedModuleCommitEvent,
  submitSignedEvent,
} from "./auth.ts";
import { AccountModal } from "./components/AccountModal.tsx";
import {
  deserializeWorkingChanges,
  serializeWorkingChanges,
} from "./working_changes_storage.ts";
import { verifyEventRecord } from "./signed_event.ts";

export type CommitWorkingChangesParams = {
  readonly moduleName: string;
  readonly message: string;
};

/** コミット前の型検査で見つかった問題 (1 パーツ 1 件) */
export type CommitTypeError = {
  readonly partName: string;
  readonly message: string;
};

export type DefinyContextValue = {
  readonly language: LanguageCode;
  readonly setLanguage: (lang: LanguageCode) => void;
  readonly events: ReadonlyArray<EventRecord>;
  readonly refreshEvents: () => Promise<void>;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  readonly parts: ReadonlyArray<PartSnapshot>;
  readonly partNames: ReadonlyMap<string, string>;
  /**
   * パーツ ID (`partIdHash`, URL-safe Base64) → パーツ. 全コミットのパーツを ID ごとに最新で持つ.
   * `parts` は `module.name` ごとに最新の 1 つだけなので, 別アカウントの同名モジュールのパーツへの
   * `PartReference` はこちらで解決する
   */
  readonly partsByIdHash: ReadonlyMap<string, PartSnapshot>;
  readonly accountNames: ReadonlyMap<string, string>;
  readonly workingChanges: WorkingChanges;
  readonly updateWorkingPart: (partId: string, change: PartChange) => void;
  readonly discardWorkingPart: (partId: string) => void;
  readonly discardAllWorkingChanges: () => void;
  readonly connectionStatus: ConnectionStatus;
  readonly currentAccount: AccountState | null;
  readonly setCurrentAccount: (account: AccountState | null) => void;
  readonly accountModalOpen: boolean;
  readonly setAccountModalOpen: (open: boolean) => void;
  readonly loginWithSecretKey: (
    secretKeyBase64: string,
    fallbackName?: string,
  ) => Promise<void>;
  readonly createAccountAndLogin: (
    accountName: string,
  ) => Promise<{ readonly secretKeyBase64: string }>;
  readonly logout: () => void;
  readonly commitWorkingChanges: (
    params: CommitWorkingChangesParams,
  ) => Promise<string>;
  /**
   * `moduleName` に作業中の変更をコミットしたときのパーツを, サーバーの `SubmitEvent` と同じ
   * definy 製の型チェッカーで検査する. ログインしていなければ空
   */
  readonly checkCommitTypes: (
    moduleName: string,
  ) => Promise<ReadonlyArray<CommitTypeError>>;
  /**
   * コミット済みのパーツを definy 製の型チェッカーで検査した結果 (キーはパーツ ID = `partIdHash`).
   * 取得済みのイベントが変わると裏で検査し直す. 検査が終わっていないパーツは入っていない
   */
  readonly partTypeCheckResults: ReadonlyMap<
    string,
    SelfHostedTypeCheckOutcome
  >;
  /**
   * 1 つのパーツ (編集中のものなど) を, コミット済みのパーツの型環境で検査する.
   * `partIdHash` があれば型環境のそのパーツを `partType` / `expression` で置き換える
   */
  readonly checkPartType: (part: {
    readonly partIdHash: string | null;
    readonly partType: unknown;
    readonly expression: unknown;
  }) => Promise<SelfHostedTypeCheckOutcome>;
  /** 型エラーの理由を 1 行にする (型の中のパーツ参照はパーツ名にする). 問題なければ `null` */
  readonly typeCheckMessage: (
    partName: string,
    outcome: SelfHostedTypeCheckOutcome,
  ) => string | null;
  readonly sidebarOpen: boolean;
  readonly toggleSidebar: () => void;
  readonly setSidebarOpen: (open: boolean) => void;
  readonly commandPaletteOpen: boolean;
  readonly setCommandPaletteOpen: (open: boolean) => void;
};

const DefinyContext = createContext<DefinyContextValue | null>(null);

// v3: Uint8Array を {"$bytes": base64url} で保存
const STORAGE_KEY_CHANGES = "definy.working_changes.v3";
const STORAGE_KEY_LANG = "definy.language";
const STORAGE_KEY_ACCOUNT = "definy.account.v1";

function loadStoredChanges(): WorkingChanges {
  if (typeof window === "undefined") {
    return { parts: new Map<string, PartChange>() };
  }
  const raw = localStorage.getItem(STORAGE_KEY_CHANGES);
  if (!raw) {
    return { parts: new Map<string, PartChange>() };
  }
  return deserializeWorkingChanges(raw);
}

function saveStoredChanges(changes: WorkingChanges): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_CHANGES, serializeWorkingChanges(changes));
}

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "en" || value === "ja" || value === "eo";
}

/**
 * URL クエリ (?lang=) が無いときにブラウザ側の情報から言語を決める。
 * 優先順位は localStorage > navigator.language > en。
 * SSR とのハイドレーション不一致を避けるため、マウント後の useEffect からのみ呼ぶ。
 */
function resolveBrowserLanguage(): LanguageCode {
  const stored = localStorage.getItem(STORAGE_KEY_LANG);
  if (isLanguageCode(stored)) return stored;
  if (navigator.language.startsWith("ja")) return "ja";
  if (navigator.language.startsWith("eo")) return "eo";
  return "en";
}

/** 署名の正しいモジュールコミットのイベントと, その中身 */
type DecodedCommitEvent = {
  readonly event: EventRecord;
  readonly commit: NonNullable<ReturnType<typeof extractModuleCommit>>;
};

/** 裏で全パーツを検査するとき, 続けて検査する時間 (1 パーツ数 ms). これを超えたらブラウザに処理を返す */
const BACKGROUND_CHECK_SLICE_MS = 30;

/**
 * ブラウザに処理を返す. `setTimeout(0)` は裏のタブで 1 秒ほどに間引かれるので `MessageChannel` を使う
 */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

/**
 * 署名の正しいイベントから, モジュールごとに最新のコミットのパーツを集める (キーはパーツ ID).
 * 型チェッカーの型環境に使う
 */
function latestParts(
  decodedCommits: ReadonlyArray<DecodedCommitEvent>,
): ReadonlyMap<string, LatestPart> {
  const candidates: Array<{
    readonly moduleId: string;
    readonly timeMs: number;
    readonly eventHash: string;
    readonly commit: NonNullable<ReturnType<typeof extractModuleCommit>>;
  }> = [];
  for (const { event: ev, commit } of decodedCommits) {
    if (commit.moduleIdHash == null) {
      continue;
    }
    candidates.push({
      moduleId: commit.moduleIdHash,
      timeMs: ev.timeMs,
      eventHash: ev.eventHash,
      commit,
    });
  }
  const commits = pickLatestCommitPerModule(candidates);
  const parts = new Map<string, LatestPart>();
  for (const [moduleId, { commit, eventHash }] of commits) {
    for (const part of commit.parts) {
      if (part.partIdHash == null) {
        continue;
      }
      parts.set(part.partIdHash, {
        partId: part.partIdHash,
        moduleId,
        name: part.name,
        partType: part.partType ?? null,
        expression: part.expression ?? null,
        // 全パーツの式のハッシュを毎回計算すると重い (seed の core だけで数 MB) ので, どのイベントの定義かで表す.
        // 同じ式でもコミットし直すと別のキーになり検査し直すが, 結果は変わらない
        expressionKey: `${eventHash}:${part.name}`,
      });
    }
  }
  return parts;
}

export function DefinyProvider({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  // ?lang= は SSR でも Void Router 経由で読めるので初期値に使う。
  // localStorage など SSR で読めない値はマウント後に反映し、初回レンダーを SSR と揃える。
  const queryLang = useRouter().query.get("lang");
  const queryLanguage = isLanguageCode(queryLang) ? queryLang : null;
  const [language, setLanguageState] = useState<LanguageCode>(
    queryLanguage ?? "en",
  );
  const [events, setEvents] = useState<ReadonlyArray<EventRecord>>([]);
  const [workingChanges, setWorkingChanges] = useState<WorkingChanges>(() => ({
    parts: new Map<string, PartChange>(),
  }));

  useEffect(() => {
    if (queryLanguage === null) {
      setLanguageState(resolveBrowserLanguage());
    }
    setWorkingChanges(loadStoredChanges());
    // マウント時に 1 度だけ反映する
  }, []);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [currentAccount, setCurrentAccountState] =
    useState<AccountState | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Close sidebar on mobile after mount to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 760) {
      setSidebarOpen(false);
    }
  }, []);

  // Load stored account on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AccountState;
          if (parsed && typeof parsed.accountId === "string") {
            setCurrentAccountState(parsed);
          }
        } catch {
          // Ignore invalid stored account
        }
      }
    }
  }, []);

  const setCurrentAccount = useCallback((acc: AccountState | null) => {
    setCurrentAccountState(acc);
    if (typeof window !== "undefined") {
      if (acc) {
        localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(acc));
      } else {
        localStorage.removeItem(STORAGE_KEY_ACCOUNT);
      }
    }
  }, []);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const updateWorkingPart = useCallback(
    (partId: string, change: PartChange) => {
      setWorkingChanges((prev) => {
        const nextParts = new Map<string, PartChange>(prev.parts);
        nextParts.set(partId, change);
        const next = { parts: nextParts };
        saveStoredChanges(next);
        return next;
      });
    },
    [],
  );

  const discardWorkingPart = useCallback((partId: string) => {
    setWorkingChanges((prev) => {
      const nextParts = new Map<string, PartChange>(prev.parts);
      nextParts.delete(partId);
      const next = { parts: nextParts };
      saveStoredChanges(next);
      return next;
    });
  }, []);

  const discardAllWorkingChanges = useCallback(() => {
    const next = { parts: new Map<string, PartChange>() };
    setWorkingChanges(next);
    saveStoredChanges(next);
  }, []);

  // Fetch events from worker backend
  const loadEvents = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/definy.v1.EventService/GetEvents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100, offset: 0 }),
      });
      if (!res.ok) {
        setConnectionStatus("error");
        return;
      }
      const data = (await res.json()) as {
        readonly events?: ReadonlyArray<Omit<EventRecord, "verification">>;
      };
      if (data.events) {
        // サーバーを信用せず、表示前に署名・ハッシュ・メタデータを検証する
        const verified = await Promise.all(
          data.events.map(async (ev): Promise<EventRecord> => ({
            ...ev,
            verification: await verifyEventRecord(ev),
          })),
        );
        setEvents(verified);
        setConnectionStatus("connected");
      }
    } catch {
      setConnectionStatus("offline");
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  // 署名の検証に通ったイベントだけを、モジュール・パーツ・アカウント名の導出に使う
  const validEvents = useMemo(
    () => events.filter((ev) => ev.verification.status === "valid"),
    [events],
  );

  // Derive account names from CreateAccount events
  const accountNames = useMemo<ReadonlyMap<string, string>>(() => {
    const map = new Map<string, string>();
    for (const ev of validEvents) {
      if (ev.eventType === "create_account") {
        const decoded = extractCreateAccount(ev.signedEventBytes);
        if (decoded) {
          map.set(decoded.accountId, decoded.accountName);
        }
      }
    }
    return map;
  }, [validEvents]);

  const loginWithSecretKey = useCallback(
    async (secretKeyBase64: string, fallbackName?: string): Promise<void> => {
      const creds = await importAccountCredentials(
        secretKeyBase64,
        fallbackName,
      );
      const existingName = accountNames.get(creds.accountId);
      const acc: AccountState = {
        accountId: creds.accountId,
        accountName: existingName ?? creds.accountName,
        secretKeyBase64: creds.secretKeyBase64,
      };
      setCurrentAccount(acc);
    },
    [accountNames, setCurrentAccount],
  );

  const createAccountAndLogin = useCallback(
    async (accountName: string): Promise<{ secretKeyBase64: string }> => {
      const creds = await generateAccountCredentials(accountName);
      const { signedEventBytes } = await createSignedAccountEvent(creds);
      const res = await submitSignedEvent(signedEventBytes);
      if (res.status !== "accepted") {
        throw new Error(`Failed to create account: ${res.status}`);
      }
      const acc: AccountState = {
        accountId: creds.accountId,
        accountName: creds.accountName,
        secretKeyBase64: creds.secretKeyBase64,
      };
      setCurrentAccount(acc);
      await loadEvents();
      return { secretKeyBase64: creds.secretKeyBase64 };
    },
    [loadEvents, setCurrentAccount],
  );

  const logout = useCallback(() => {
    setCurrentAccount(null);
  }, [setCurrentAccount]);

  // モジュールコミットの中身は大きい (seed の core だけで数 MB) ので, デコードは 1 度だけにして使い回す
  const decodedCommits = useMemo<ReadonlyArray<DecodedCommitEvent>>(
    () =>
      validEvents.flatMap((event) => {
        if (event.eventType !== "module_commit") return [];
        const commit = extractModuleCommit(event.signedEventBytes);
        return commit === null ? [] : [{ event, commit }];
      }),
    [validEvents],
  );

  // Derive module and part snapshots from events and working changes
  const { modules, parts, partNames, partsByIdHash } = useMemo(() => {
    const moduleMap = new Map<string, ModuleSnapshot>();
    const partMap = new Map<string, PartSnapshot>();
    const partIdHashMap = new Map<string, PartSnapshot>();
    const nameMap = new Map<string, string>();

    // Sort events ascending by time
    const sorted = [...decodedCommits].sort(
      (a, b) => a.event.timeMs - b.event.timeMs,
    );

    for (const { event: ev, commit } of sorted) {
      const moduleParts: ReadonlyArray<ModulePartSnapshot> = commit.parts.map(
        (p) => {
          const partId = `${commit.moduleName}.${p.name}`;
          const partSnapshot: PartSnapshot = {
            partId,
            moduleId: commit.moduleName,
            moduleName: commit.moduleName,
            name: p.name,
            description: p.description,
            partType: p.partType,
            contentHash: p.contentHash ?? null,
            partIdHash: p.partIdHash ?? null,
            expression: p.expression ?? null,
            updatedAtMs: ev.timeMs,
          };
          partMap.set(partId, partSnapshot);
          if (p.partIdHash) {
            partIdHashMap.set(p.partIdHash, partSnapshot);
          }

          // パーツ参照 (PartReference) の表示名解決用: ID の Base64URL / `module.name` → `module.name`
          nameMap.set(partId, partId);
          if (p.partIdHash) {
            nameMap.set(p.partIdHash, partId);
          }
          if (p.contentHash) {
            nameMap.set(p.contentHash, partId);
          }

          return {
            partId,
            name: p.name,
            description: p.description,
            partType: p.partType,
            contentHash: p.contentHash ?? null,
            partIdHash: p.partIdHash ?? null,
            expression: p.expression ?? null,
          };
        },
      );

      moduleMap.set(commit.moduleName, {
        moduleId: commit.moduleName,
        name: commit.moduleName,
        description: commit.moduleDescription,
        latestEventHash: ev.eventHash,
        parentCommitHash: commit.parentCommitHash,
        message: commit.message,
        parts: moduleParts,
        updatedAtMs: ev.timeMs,
      });
    }

    return {
      modules: Array.from(moduleMap.values()),
      parts: Array.from(partMap.values()),
      partNames: nameMap,
      partsByIdHash: partIdHashMap,
    };
  }, [decodedCommits]);

  /** `moduleName` に作業中の変更をコミットするときのパーツ (今のモジュールのパーツに変更を重ねたもの) */
  const buildCommitParts = useCallback(
    (
      moduleName: string,
    ): {
      readonly existingModule: ModuleSnapshot | undefined;
      readonly partsList: ReadonlyArray<DecodedPart>;
      readonly committedPartIds: ReadonlySet<string>;
    } => {
      const existingModule = modules.find((m) => m.name === moduleName);

      const partMap = new Map<string, DecodedPart>();
      if (existingModule) {
        for (const p of existingModule.parts) {
          partMap.set(p.name, {
            name: p.name,
            description: p.description,
            partType: p.partType,
            expression: p.expression,
            contentHash: p.contentHash,
            partIdHash: p.partIdHash,
          });
        }
      }

      const committedPartIds = new Set<string>();
      for (const [partId, change] of workingChanges.parts.entries()) {
        const dotIndex = partId.indexOf(".");
        const partModule =
          dotIndex >= 0 ? partId.slice(0, dotIndex) : moduleName;
        const partName =
          dotIndex >= 0 ? partId.slice(dotIndex + 1) : change.name;

        if (partModule === moduleName || change.name === partName) {
          partMap.set(change.name, {
            name: change.name,
            description: change.description,
            partType: change.partType,
            expression: change.expression,
            contentHash: null,
            partIdHash: null,
          });
          committedPartIds.add(partId);
        }
      }

      const partsList: ReadonlyArray<DecodedPart> = Array.from(
        partMap.values(),
      );
      return { existingModule, partsList, committedPartIds };
    },
    [modules, workingChanges],
  );

  const commitWorkingChanges = useCallback(
    async ({
      moduleName,
      message,
    }: CommitWorkingChangesParams): Promise<string> => {
      if (!currentAccount || !currentAccount.secretKeyBase64) {
        throw new Error("You must be logged in to commit changes");
      }

      const { existingModule, partsList, committedPartIds } =
        buildCommitParts(moduleName);
      if (partsList.length === 0) {
        throw new Error(`No parts found to commit for module '${moduleName}'`);
      }
      const parentCommitHash = existingModule?.latestEventHash ?? null;

      const { signedEventBytes, eventHash } =
        await createSignedModuleCommitEvent({
          credentials: {
            accountId: currentAccount.accountId,
            accountName: currentAccount.accountName,
            secretKeyBase64: currentAccount.secretKeyBase64,
          },
          moduleName,
          moduleDescription: existingModule?.description ?? [],
          message,
          parentCommitHash,
          parts: partsList,
        });

      const submitRes = await submitSignedEvent(signedEventBytes);
      if (submitRes.status !== "accepted") {
        throw new Error(`Commit rejected with status: ${submitRes.status}`);
      }

      setWorkingChanges((prev) => {
        const nextParts = new Map<string, PartChange>(prev.parts);
        for (const id of committedPartIds) {
          nextParts.delete(id);
        }
        const next = { parts: nextParts };
        saveStoredChanges(next);
        return next;
      });

      await loadEvents();
      return eventHash;
    },
    [currentAccount, buildCommitParts, loadEvents],
  );

  // 型チェッカーの型環境に使う, 署名の正しいイベントの全モジュールの最新のパーツ
  const committedParts = useMemo(
    () => latestParts(decodedCommits),
    [decodedCommits],
  );

  const typeCheckMessage = useCallback(
    (partName: string, outcome: SelfHostedTypeCheckOutcome) =>
      outcomeErrorMessage(partName, outcome, (partId) => partNames.get(partId)),
    [partNames],
  );

  // コミット済みの全パーツを裏で検査する. 型環境 (全パーツの型) も式も変わっていないパーツは前の結果を使う.
  // 描画を止めないよう数パーツずつ区切ってブラウザに処理を返す
  const [partTypeCheckResults, setPartTypeCheckResults] = useState<
    ReadonlyMap<string, SelfHostedTypeCheckOutcome>
  >(new Map());
  const partTypeCheckCache = useRef<
    Map<
      string,
      {
        readonly envKey: string;
        readonly expressionKey: string | null;
        readonly outcome: SelfHostedTypeCheckOutcome;
      }
    >
  >(new Map());
  useEffect(() => {
    if (committedParts.size === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const envKey = typeEnvKey(committedParts.values());
      const cache = partTypeCheckCache.current;
      const results = new Map<string, SelfHostedTypeCheckOutcome>();
      const pending: Array<LatestPart> = [];
      for (const part of committedParts.values()) {
        if (part.expression == null || part.partType == null) {
          continue;
        }
        const cached = cache.get(part.partId);
        if (
          cached !== undefined &&
          cached.envKey === envKey &&
          cached.expressionKey === part.expressionKey
        ) {
          results.set(part.partId, cached.outcome);
        } else {
          pending.push(part);
        }
      }
      if (pending.length === 0) {
        setPartTypeCheckResults(results);
        return;
      }
      // 最初の描画とイベントの読み込みの邪魔をしないよう, 少し待ってから始める
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (cancelled) {
        return;
      }
      const session = createTypeCheckSession({
        typeChecker: await loadTypeChecker(),
        env: typeEnvFromParts(committedParts.values()),
      });
      // 30ms ずつ検査してはブラウザに処理を返す
      let sliceStarted = performance.now();
      for (const part of pending) {
        if (performance.now() - sliceStarted > BACKGROUND_CHECK_SLICE_MS) {
          await yieldToBrowser();
          if (cancelled) {
            return;
          }
          sliceStarted = performance.now();
        }
        const outcome = session.check(part);
        results.set(part.partId, outcome);
        cache.set(part.partId, {
          envKey,
          expressionKey: part.expressionKey,
          outcome,
        });
      }
      // 結果はコンテキストを使う全コンポーネントを描画し直すので, 最後に 1 度だけ反映する
      setPartTypeCheckResults(results);
    })().catch((e: unknown) => {
      console.error("background type check failed", e);
    });
    return () => {
      cancelled = true;
    };
  }, [committedParts]);

  const checkPartType = useCallback(
    async (part: {
      readonly partIdHash: string | null;
      readonly partType: unknown;
      readonly expression: unknown;
    }): Promise<SelfHostedTypeCheckOutcome> => {
      const typeChecker = await loadTypeChecker();
      const parts = new Map(committedParts);
      const committed =
        part.partIdHash === null ? undefined : parts.get(part.partIdHash);
      if (committed !== undefined) {
        parts.set(committed.partId, {
          ...committed,
          partType: part.partType,
          expression: part.expression,
        });
      }
      return (
        checkParts({
          typeChecker,
          parts: [{ partType: part.partType, expression: part.expression }],
          env: typeEnvFromParts(parts.values()),
        })[0] ?? { kind: "checker_failed", message: "no result" }
      );
    },
    [committedParts],
  );

  const checkCommitTypes = useCallback(
    async (moduleName: string): Promise<ReadonlyArray<CommitTypeError>> => {
      if (!currentAccount) {
        return [];
      }
      const { partsList } = buildCommitParts(moduleName);
      if (partsList.length === 0) {
        return [];
      }
      const typeChecker = await loadTypeChecker();
      const moduleIdBytes = deriveModuleIdBytesSync(
        base64ToBytes(currentAccount.accountId),
        moduleName,
      );
      const moduleId = bytesToUrlSafeBase64NoPad(moduleIdBytes);
      const committed: ReadonlyArray<LatestPart> = partsList.map((part) => ({
        partId: deriveModulePartIdSync(moduleIdBytes, part.name),
        moduleId,
        name: part.name,
        partType: part.partType ?? null,
        expression: part.expression ?? null,
        // 型環境のパーツのキー (イベントごと) とは比べられないので, 変更の有無にかかわらず検査する
        expressionKey: null,
      }));
      return checkModuleCommitParts({
        typeChecker,
        moduleId,
        committed,
        latestParts: committedParts,
        // 式の無いパーツ・コンパイラ組み込みを受け入れるか (システムアカウントか) はサーバーが決めるので,
        // ここでは型エラーと型チェッカーの失敗だけを出す
        allowBuiltinParts: true,
      }).flatMap(({ name, outcome }) => {
        const message = typeCheckMessage(name, outcome);
        return message === null ? [] : [{ partName: name, message }];
      });
    },
    [currentAccount, buildCommitParts, committedParts, typeCheckMessage],
  );

  const value = useMemo<DefinyContextValue>(
    () => ({
      language,
      setLanguage,
      events,
      refreshEvents: loadEvents,
      modules,
      parts,
      partNames,
      partsByIdHash,
      accountNames,
      workingChanges,
      updateWorkingPart,
      discardWorkingPart,
      discardAllWorkingChanges,
      connectionStatus,
      currentAccount,
      setCurrentAccount,
      accountModalOpen,
      setAccountModalOpen,
      loginWithSecretKey,
      createAccountAndLogin,
      logout,
      commitWorkingChanges,
      checkCommitTypes,
      partTypeCheckResults,
      checkPartType,
      typeCheckMessage,
      sidebarOpen,
      toggleSidebar,
      setSidebarOpen,
      commandPaletteOpen,
      setCommandPaletteOpen,
    }),
    [
      language,
      setLanguage,
      events,
      loadEvents,
      modules,
      parts,
      partNames,
      partsByIdHash,
      accountNames,
      workingChanges,
      updateWorkingPart,
      discardWorkingPart,
      discardAllWorkingChanges,
      connectionStatus,
      currentAccount,
      setCurrentAccount,
      accountModalOpen,
      setAccountModalOpen,
      loginWithSecretKey,
      createAccountAndLogin,
      logout,
      commitWorkingChanges,
      checkCommitTypes,
      partTypeCheckResults,
      checkPartType,
      typeCheckMessage,
      sidebarOpen,
      toggleSidebar,
      commandPaletteOpen,
    ],
  );

  return (
    <DefinyContext.Provider value={value}>
      {children}
      <AccountModal
        open={accountModalOpen}
        onClose={() => {
          setAccountModalOpen(false);
        }}
      />
    </DefinyContext.Provider>
  );
}

export function useDefiny(): DefinyContextValue {
  const ctx = useContext(DefinyContext);
  if (!ctx) {
    throw new Error("useDefiny must be used within a DefinyProvider");
  }
  return ctx;
}
