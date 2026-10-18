import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";
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
  extractCreateAccount,
  extractModuleCommit,
  type DecodedPart,
} from "./cbor.ts";
import {
  generateAccountCredentials,
  importAccountCredentials,
  createSignedAccountEvent,
  createSignedModuleCommitEvent,
  submitSignedEvent,
} from "./auth.ts";
import { AccountModal } from "./components/AccountModal.tsx";
import {
  createStage1Compiler,
  evaluateCompiledWasm,
  type DefinyValue,
} from "./stage1_compiler.ts";

export interface CommitWorkingChangesParams {
  readonly moduleName: string;
  readonly message: string;
}

export interface DefinyContextValue {
  readonly language: LanguageCode;
  readonly setLanguage: (lang: LanguageCode) => void;
  readonly events: ReadonlyArray<EventRecord>;
  readonly refreshEvents: () => Promise<void>;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  readonly parts: ReadonlyArray<PartSnapshot>;
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
  ) => Promise<{ secretKeyBase64: string }>;
  readonly logout: () => void;
  readonly commitWorkingChanges: (
    params: CommitWorkingChangesParams,
  ) => Promise<string>;
  readonly sidebarOpen: boolean;
  readonly toggleSidebar: () => void;
  readonly setSidebarOpen: (open: boolean) => void;
  readonly commandPaletteOpen: boolean;
  readonly setCommandPaletteOpen: (open: boolean) => void;
  readonly evaluatePart: (part: PartSnapshot) => Promise<DefinyValue>;
}

const DefinyContext = createContext<DefinyContextValue | null>(null);

const STORAGE_KEY_CHANGES = "definy.working_changes.v1";
const STORAGE_KEY_LANG = "definy.language";
const STORAGE_KEY_ACCOUNT = "definy.account.v1";

function loadStoredChanges(): WorkingChanges {
  if (typeof window === "undefined") {
    return { parts: new Map<string, PartChange>() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHANGES);
    if (!raw) return { parts: new Map<string, PartChange>() };
    const parsed = JSON.parse(raw) as {
      readonly parts?: Record<string, PartChange>;
    };
    const partsMap = new Map<string, PartChange>();
    if (parsed.parts) {
      for (const [k, v] of Object.entries(parsed.parts)) {
        partsMap.set(k, v);
      }
    }
    return { parts: partsMap };
  } catch {
    return { parts: new Map<string, PartChange>() };
  }
}

function saveStoredChanges(changes: WorkingChanges): void {
  if (typeof window === "undefined") return;
  const obj: Record<string, PartChange> = {};
  for (const [k, v] of changes.parts.entries()) {
    obj[k] = v;
  }
  localStorage.setItem(STORAGE_KEY_CHANGES, JSON.stringify({ parts: obj }));
}

function initialLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  const params = new URLSearchParams(window.location.search);
  const q = params.get("lang");
  if (q === "en" || q === "ja" || q === "eo") return q;
  const stored = localStorage.getItem(STORAGE_KEY_LANG);
  if (stored === "en" || stored === "ja" || stored === "eo") return stored;
  return "en";
}

let cachedCompilerModule: WebAssembly.Module | null = null;

async function getCompilerModule(): Promise<WebAssembly.Module> {
  if (cachedCompilerModule) return cachedCompilerModule;
  const res = await fetch("/virtual/wasm/stage1.wasm");
  if (!res.ok) {
    throw new Error(
      `Failed to fetch stage1.wasm: ${res.status} ${res.statusText}`,
    );
  }
  const bytes = await res.arrayBuffer();
  cachedCompilerModule = await WebAssembly.compile(bytes);
  return cachedCompilerModule;
}

export function DefinyProvider({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const [language, setLanguageState] = useState<LanguageCode>(initialLanguage);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_LANG);
      if (stored === "en" || stored === "ja" || stored === "eo") {
        setLanguageState(stored);
      } else if (navigator.language.startsWith("ja")) {
        setLanguageState("ja");
      }
    }
  }, []);
  const [events, setEvents] = useState<ReadonlyArray<EventRecord>>([]);
  const [workingChanges, setWorkingChanges] =
    useState<WorkingChanges>(loadStoredChanges);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [currentAccount, setCurrentAccountState] =
    useState<AccountState | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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
        readonly events?: ReadonlyArray<EventRecord>;
      };
      if (data.events) {
        setEvents(data.events);
        setConnectionStatus("connected");
      }
    } catch {
      setConnectionStatus("offline");
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  // Derive account names from CreateAccount events
  const accountNames = useMemo<ReadonlyMap<string, string>>(() => {
    const map = new Map<string, string>();
    for (const ev of events) {
      if (ev.eventType === "create_account") {
        const decoded = extractCreateAccount(ev.signedEventBytes);
        if (decoded) {
          map.set(decoded.accountId, decoded.accountName);
        }
      }
    }
    return map;
  }, [events]);

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

  // Derive module and part snapshots from events and working changes
  const { modules, parts } = useMemo(() => {
    const moduleMap = new Map<string, ModuleSnapshot>();
    const partMap = new Map<string, PartSnapshot>();

    // Sort events ascending by time
    const sorted = [...events].sort((a, b) => a.timeMs - b.timeMs);

    for (const ev of sorted) {
      if (ev.eventType === "module_commit") {
        const commit = extractModuleCommit(ev.signedEventBytes);
        if (!commit) continue;

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
              contentHash: p.contentHash,
              expression: p.expression,
              updatedAtMs: ev.timeMs,
            };
            partMap.set(partId, partSnapshot);
            return {
              partId,
              name: p.name,
              description: p.description,
              partType: p.partType,
              contentHash: p.contentHash,
              expression: p.expression,
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
    }

    return {
      modules: Array.from(moduleMap.values()),
      parts: Array.from(partMap.values()),
    };
  }, [events]);

  const commitWorkingChanges = useCallback(
    async ({
      moduleName,
      message,
    }: CommitWorkingChangesParams): Promise<string> => {
      if (!currentAccount || !currentAccount.secretKeyBase64) {
        throw new Error("You must be logged in to commit changes");
      }

      const existingModule = modules.find((m) => m.name === moduleName);
      const parentCommitHash = existingModule?.latestEventHash ?? null;

      const partMap = new Map<string, DecodedPart>();
      if (existingModule) {
        for (const p of existingModule.parts) {
          partMap.set(p.name, {
            name: p.name,
            description: p.description,
            partType: p.partType,
            expression: p.expression,
            contentHash: p.contentHash,
          });
        }
      }

      const committedPartIds: Array<string> = [];
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
          });
          committedPartIds.push(partId);
        }
      }

      if (partMap.size === 0) {
        throw new Error(`No parts found to commit for module '${moduleName}'`);
      }

      const partsList: ReadonlyArray<DecodedPart> = Array.from(
        partMap.values(),
      );

      const { signedEventBytes, eventHash } =
        await createSignedModuleCommitEvent({
          credentials: {
            accountId: currentAccount.accountId,
            accountName: currentAccount.accountName,
            secretKeyBase64: currentAccount.secretKeyBase64,
          },
          moduleName,
          moduleDescription:
            existingModule?.description ?? `${moduleName} module`,
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
    [currentAccount, modules, workingChanges, loadEvents],
  );

  const evaluatePart = useCallback(
    async (part: PartSnapshot): Promise<DefinyValue> => {
      const stage1Module = await getCompilerModule();
      const compiler = createStage1Compiler(stage1Module);
      const expr = part.expression ?? {
        Variant: {
          tag: "number",
          payload: { Number: { value: 0 } },
        },
      };
      const wasmBytes = compiler.compile(expr);
      return await evaluateCompiledWasm(wasmBytes);
    },
    [],
  );

  const value = useMemo<DefinyContextValue>(
    () => ({
      language,
      setLanguage,
      events,
      refreshEvents: loadEvents,
      modules,
      parts,
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
      sidebarOpen,
      toggleSidebar,
      setSidebarOpen,
      commandPaletteOpen,
      setCommandPaletteOpen,
      evaluatePart,
    }),
    [
      language,
      setLanguage,
      events,
      loadEvents,
      modules,
      parts,
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
      sidebarOpen,
      toggleSidebar,
      commandPaletteOpen,
      evaluatePart,
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
