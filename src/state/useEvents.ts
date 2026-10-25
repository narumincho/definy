import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ConnectionStatus,
  EventRecord,
  ModulePartSnapshot,
  ModuleSnapshot,
  PartSnapshot,
} from "../types.ts";
import { extractCreateAccount, extractModuleCommit } from "../cbor.ts";
import { verifyEventRecord } from "../signed_event.ts";
import { pickLatestCommitPerModule } from "../latest_commits.ts";
import {
  displayedBranch,
  sortBranches,
  type BranchSummary,
} from "../branches.ts";
import type { LatestPart } from "../self_hosted_type_check.ts";
import {
  loadContents,
  missingContentHashes,
  withCachedContents,
} from "../content_store.ts";

/** 署名の正しいモジュールコミットのイベントと, その中身 */
export type DecodedCommitEvent = {
  readonly event: EventRecord;
  readonly commit: NonNullable<ReturnType<typeof extractModuleCommit>>;
};

/**
 * 署名の正しいイベントから, モジュールごとに最新のコミットのパーツを集める (キーはパーツ ID).
 * 型チェッカーの型環境に使う
 */
export function latestParts(
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
        // CAS に預けた式は content hash で表す. 式を直接入れたコミットは (全パーツの式のハッシュを毎回計算すると重いので)
        // どのイベントの定義かで表す. 同じ式でもコミットし直すと別のキーになり検査し直すが, 結果は変わらない
        expressionKey: part.contentHash ?? `${eventHash}:${part.name}`,
      });
    }
  }
  return parts;
}

export type EventsState = {
  /**
   * 読んだイベント (新しい順). 全イベントではなく, 最新の 100 件, 各モジュールの各ブランチの最新のコミット,
   * 全アカウントの作成, `loadEvent` で読んだもの
   */
  readonly events: ReadonlyArray<EventRecord>;
  readonly refreshEvents: () => Promise<void>;
  readonly connectionStatus: ConnectionStatus;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  readonly parts: ReadonlyArray<PartSnapshot>;
  readonly partNames: ReadonlyMap<string, string>;
  readonly partsByIdHash: ReadonlyMap<string, PartSnapshot>;
  readonly accountNames: ReadonlyMap<string, string>;
  readonly committedParts: ReadonlyMap<string, LatestPart>;
  readonly decodedCommits: ReadonlyArray<DecodedCommitEvent>;
  /** モジュール名 → そのモジュールのブランチ (main が先頭) */
  readonly branchesByModule: ReadonlyMap<string, ReadonlyArray<BranchSummary>>;
  /** モジュール名 → 表示しているブランチ (選んでいなければ main) */
  readonly displayedBranches: ReadonlyMap<string, string>;
  /** モジュール `moduleName` で表示するブランチを選ぶ (localStorage に残す) */
  readonly selectBranch: (moduleName: string, branch: string) => void;
  /** 読んでいないイベント (古いコミットなど) を 1 件読んで `events` に足す. 見つからなければ `false` */
  readonly loadEvent: (eventHash: string) => Promise<boolean>;
  /** モジュールのコミットを読んで (読んでいなければ `GetEvent` で) デコードする. 無い・不正なら `null` */
  readonly fetchCommit: (
    eventHash: string,
  ) => Promise<DecodedCommitEvent | null>;
};

const STORAGE_KEY_SELECTED_BRANCHES = "definy.selected_branches.v1";

function loadSelectedBranches(): ReadonlyMap<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SELECTED_BRANCHES);
    if (raw === null) return new Map();
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return new Map();
    return new Map(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return new Map();
  }
}

function saveSelectedBranches(selected: ReadonlyMap<string, string>): void {
  try {
    localStorage.setItem(
      STORAGE_KEY_SELECTED_BRANCHES,
      JSON.stringify(Object.fromEntries(selected)),
    );
  } catch {
    // 保存できなくても表示は変わらない
  }
}

/** サーバーの `GetEvents` / `GetEvent` / `GetModuleBranches` が返すイベント 1 件 (検証前) */
type ServerEvent = Omit<EventRecord, "verification">;

/** タイムラインに出す最新のイベントの数 */
const RECENT_EVENTS_LIMIT = 100;
/** アカウントの作成イベントを読む 1 ページの数 (全件読む) */
const ACCOUNT_EVENTS_PAGE_SIZE = 500;

/** モジュールのブランチ (`GetModuleBranches`). 最新のコミットのイベントは `events` に入れる */
type BranchHead = {
  readonly moduleName: string;
  readonly branch: string;
  readonly creatorAccountId: string;
  readonly commitCount: number;
  readonly latestEventHash: string;
};

/** サーバーが HTTP のエラーを返した (届かなかったのではない) */
class RpcHttpError extends Error {}

async function postRpc<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`/definy.v1.EventService/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new RpcHttpError(`${method} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/** 全アカウントの作成イベント (アカウント名に使う. 小さいので全件読む) */
async function fetchAllAccountEvents(): Promise<ReadonlyArray<ServerEvent>> {
  const all: ServerEvent[] = [];
  for (let offset = 0; ; offset += ACCOUNT_EVENTS_PAGE_SIZE) {
    const page =
      (
        await postRpc<{ readonly events?: ReadonlyArray<ServerEvent> }>(
          "GetEvents",
          {
            eventType: "create_account",
            limit: ACCOUNT_EVENTS_PAGE_SIZE,
            offset,
          },
        )
      ).events ?? [];
    all.push(...page);
    if (page.length < ACCOUNT_EVENTS_PAGE_SIZE) {
      return all;
    }
  }
}

/**
 * イベントハッシュ → 検証の結果. イベントは変わらないので 1 度だけ検証する
 * (seed の core のコミットは数 MB あり, 読み直すたびに検証すると重い)
 */
const verificationCache = new Map<string, Promise<EventRecord>>();

function verifyCached(ev: ServerEvent): Promise<EventRecord> {
  const key = `${ev.eventHash}:${ev.accountId}:${ev.eventType}:${ev.timeMs}:${ev.signedEventBytes.length}`;
  let verified = verificationCache.get(key);
  if (verified === undefined) {
    // サーバーを信用せず、表示前に署名・ハッシュ・メタデータを検証する
    verified = verifyEventRecord(ev).then((verification) => ({
      ...ev,
      verification,
    }));
    verificationCache.set(key, verified);
  }
  return verified;
}

/** 検証したイベント → デコードしたコミット. `loadEvent` でイベントが増えるたびに全部デコードし直さない */
const decodedCommitCache = new WeakMap<
  EventRecord,
  DecodedCommitEvent | null
>();

function decodeCommitEvent(event: EventRecord): DecodedCommitEvent | null {
  let decoded = decodedCommitCache.get(event);
  if (decoded === undefined) {
    const commit = extractModuleCommit(event.signedEventBytes);
    decoded = commit === null ? null : { event, commit };
    decodedCommitCache.set(event, decoded);
  }
  return decoded;
}

/** コミットのパーツの式を, CAS から読んだもので埋める (`decodeCommitEvent` の結果は変えない) */
const resolvedCommitCache = new WeakMap<
  DecodedCommitEvent,
  { readonly contentsVersion: number; readonly resolved: DecodedCommitEvent }
>();

function resolveCommitContents(
  decoded: DecodedCommitEvent,
  contentsVersion: number,
): DecodedCommitEvent {
  const cached = resolvedCommitCache.get(decoded);
  if (cached?.contentsVersion === contentsVersion) {
    return cached.resolved;
  }
  const parts = withCachedContents(decoded.commit.parts);
  const resolved =
    parts === decoded.commit.parts
      ? decoded
      : { event: decoded.event, commit: { ...decoded.commit, parts } };
  resolvedCommitCache.set(decoded, { contentsVersion, resolved });
  return resolved;
}

/** 署名の正しいモジュールのコミットのうち, CAS から式を読む必要があるものを読む. 読んだら `true` */
async function loadCommitContents(
  records: ReadonlyArray<EventRecord>,
): Promise<boolean> {
  const hashes = new Set<string>();
  for (const record of records) {
    if (
      record.verification.status !== "valid" ||
      record.eventType !== "module_commit"
    ) {
      continue;
    }
    const decoded = decodeCommitEvent(record);
    if (decoded === null) continue;
    for (const hash of missingContentHashes(decoded.commit.parts)) {
      hashes.add(hash);
    }
  }
  if (hashes.size === 0) return false;
  return await loadContents([...hashes], postRpc);
}

export function useEvents(): EventsState {
  /** サーバーから読んだイベント (最新のもの, 各ブランチの最新のコミット, 全アカウントの作成, 個別に読んだもの) */
  const [eventMap, setEventMap] = useState<ReadonlyMap<string, EventRecord>>(
    () => new Map(),
  );
  const [branchHeads, setBranchHeads] = useState<ReadonlyArray<BranchHead>>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  /** CAS から式を読むたびに増やす (パーツの式を埋め直す) */
  const [contentsVersion, setContentsVersion] = useState(0);
  const loadContentsOf = useCallback(
    async (records: ReadonlyArray<EventRecord>): Promise<void> => {
      if (await loadCommitContents(records)) {
        setContentsVersion((v) => v + 1);
      }
    },
    [],
  );

  const addEvents = useCallback((records: ReadonlyArray<EventRecord>) => {
    setEventMap((prev) => {
      const next = new Map(prev);
      for (const record of records) {
        next.set(record.eventHash, record);
      }
      return next;
    });
  }, []);

  // モジュールの状態は全イベントを読まずに, 各ブランチの最新のコミットから作る (docs/branch.md)
  const refreshEvents = useCallback(async (): Promise<void> => {
    try {
      const [recent, branches, accounts] = await Promise.all([
        postRpc<{ readonly events?: ReadonlyArray<ServerEvent> }>("GetEvents", {
          limit: RECENT_EVENTS_LIMIT,
          offset: 0,
        }),
        postRpc<{
          readonly branches?: ReadonlyArray<
            Omit<BranchHead, "latestEventHash"> & {
              readonly latestEvent: ServerEvent;
            }
          >;
        }>("GetModuleBranches", {}),
        fetchAllAccountEvents(),
      ]);
      const verified = await Promise.all(
        [
          ...(recent.events ?? []),
          ...(branches.branches ?? []).map((b) => b.latestEvent),
          ...accounts,
        ].map(verifyCached),
      );
      // コミットのパーツの式 (CAS) を読んでから表示する
      await loadContentsOf(verified);
      addEvents(verified);
      setBranchHeads(
        (branches.branches ?? []).map((b) => ({
          moduleName: b.moduleName,
          branch: b.branch,
          creatorAccountId: b.creatorAccountId,
          commitCount: Number(b.commitCount),
          latestEventHash: b.latestEvent.eventHash,
        })),
      );
      setConnectionStatus("connected");
    } catch (e) {
      setConnectionStatus(e instanceof RpcHttpError ? "error" : "offline");
    }
  }, [addEvents, loadContentsOf]);

  /** 読んでいないイベント (古いコミットなど) を 1 件読む. 見つからなければ `false` */
  const loadEvent = useCallback(
    async (eventHash: string): Promise<boolean> => {
      try {
        const { event } = await postRpc<{ readonly event?: ServerEvent }>(
          "GetEvent",
          { eventHash },
        );
        if (event === undefined) return false;
        const record = await verifyCached(event);
        await loadContentsOf([record]);
        addEvents([record]);
        return true;
      } catch {
        return false;
      }
    },
    [addEvents, loadContentsOf],
  );

  // fetchCommit が最新のイベントを見るため
  const eventMapRef = useRef(eventMap);
  eventMapRef.current = eventMap;

  /** モジュールのコミットを読んで (読んでいなければ `GetEvent` で) デコードする. 無い・不正なら `null` */
  const fetchCommit = useCallback(
    async (eventHash: string): Promise<DecodedCommitEvent | null> => {
      let record = eventMapRef.current.get(eventHash);
      if (record === undefined) {
        try {
          const { event } = await postRpc<{ readonly event?: ServerEvent }>(
            "GetEvent",
            { eventHash },
          );
          if (event === undefined) return null;
          record = await verifyCached(event);
          addEvents([record]);
        } catch {
          return null;
        }
      }
      if (
        record.verification.status !== "valid" ||
        record.eventType !== "module_commit"
      ) {
        return null;
      }
      const decoded = decodeCommitEvent(record);
      if (decoded === null) return null;
      try {
        await loadContentsOf([record]);
      } catch {
        return null;
      }
      // 読んだ式で埋める (読めなかった式は `null` のまま)
      return {
        event: decoded.event,
        commit: {
          ...decoded.commit,
          parts: withCachedContents(decoded.commit.parts),
        },
      };
    },
    [addEvents, loadContentsOf],
  );

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  /** 新しい順 */
  const events = useMemo(
    () => [...eventMap.values()].sort((a, b) => b.timeMs - a.timeMs),
    [eventMap],
  );

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

  // モジュールコミットの中身は大きい (seed の core だけで数 MB) ので, デコードは 1 度だけにして使い回す
  const decodedCommits = useMemo<ReadonlyArray<DecodedCommitEvent>>(
    () =>
      validEvents.flatMap((event) => {
        if (event.eventType !== "module_commit") return [];
        const decoded = decodeCommitEvent(event);
        return decoded === null
          ? []
          : [resolveCommitContents(decoded, contentsVersion)];
      }),
    [validEvents, contentsVersion],
  );

  const [selectedBranches, setSelectedBranches] = useState<
    ReadonlyMap<string, string>
  >(() => new Map());
  useEffect(() => {
    setSelectedBranches(loadSelectedBranches());
  }, []);
  const selectBranch = useCallback((moduleName: string, branch: string) => {
    setSelectedBranches((prev) => {
      const next = new Map(prev);
      next.set(moduleName, branch);
      saveSelectedBranches(next);
      return next;
    });
  }, []);

  // モジュールごとのブランチと, 表示するブランチ (docs/branch.md)
  const { branchesByModule, displayedBranches, displayedCommits } =
    useMemo(() => {
      const branchesMap = new Map<string, BranchSummary[]>();
      for (const head of branchHeads) {
        const latest = eventMap.get(head.latestEventHash);
        if (latest?.verification.status !== "valid") continue;
        const list = branchesMap.get(head.moduleName) ?? [];
        list.push({
          name: head.branch,
          creatorAccountId: head.creatorAccountId,
          latestEventHash: head.latestEventHash,
          latestTimeMs: latest.timeMs,
          commitCount: head.commitCount,
        });
        branchesMap.set(head.moduleName, list);
      }
      const sortedMap = new Map<string, ReadonlyArray<BranchSummary>>();
      const displayedMap = new Map<string, string>();
      const displayedHashes = new Set<string>();
      for (const [moduleName, branches] of branchesMap) {
        const sorted = sortBranches(branches);
        sortedMap.set(moduleName, sorted);
        const displayed = displayedBranch(
          sorted,
          selectedBranches.get(moduleName),
        );
        displayedMap.set(moduleName, displayed);
        const head = sorted.find((b) => b.name === displayed);
        if (head !== undefined) displayedHashes.add(head.latestEventHash);
      }
      return {
        branchesByModule: sortedMap,
        displayedBranches: displayedMap,
        displayedCommits: decodedCommits.filter(({ event }) =>
          displayedHashes.has(event.eventHash),
        ),
      };
    }, [branchHeads, eventMap, decodedCommits, selectedBranches]);

  // 表示するブランチのコミットから, モジュールとパーツを導出する
  const { modules, parts, partNames, partsByIdHash } = useMemo(() => {
    const moduleMap = new Map<string, ModuleSnapshot>();
    const partMap = new Map<string, PartSnapshot>();
    const partIdHashMap = new Map<string, PartSnapshot>();
    const nameMap = new Map<string, string>();

    // Sort events ascending by time
    const sorted = [...displayedCommits].sort(
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
        branch: commit.branch,
        branches: branchesByModule.get(commit.moduleName) ?? [],
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
  }, [displayedCommits, branchesByModule]);

  // 型チェッカーの型環境に使う, 全モジュールの表示しているブランチの最新のパーツ
  const committedParts = useMemo(
    () => latestParts(displayedCommits),
    [displayedCommits],
  );

  return {
    events,
    refreshEvents,
    connectionStatus,
    modules,
    parts,
    partNames,
    partsByIdHash,
    accountNames,
    committedParts,
    decodedCommits,
    branchesByModule,
    displayedBranches,
    selectBranch,
    loadEvent,
    fetchCommit,
  };
}
