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
  ModuleSnapshot,
  PartChange,
  PartSnapshot,
  WorkingChanges,
} from "./types.ts";
import {
  createStage1Compiler,
  evaluateCompiledWasm,
  type DefinyValue,
} from "./stage1_compiler.ts";

export interface DefinyContextValue {
  readonly language: LanguageCode;
  readonly setLanguage: (lang: LanguageCode) => void;
  readonly events: ReadonlyArray<EventRecord>;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  readonly parts: ReadonlyArray<PartSnapshot>;
  readonly workingChanges: WorkingChanges;
  readonly updateWorkingPart: (partId: string, change: PartChange) => void;
  readonly discardWorkingPart: (partId: string) => void;
  readonly discardAllWorkingChanges: () => void;
  readonly connectionStatus: ConnectionStatus;
  readonly currentAccount: AccountState | null;
  readonly setCurrentAccount: (account: AccountState | null) => void;
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
  if (navigator.language.startsWith("ja")) return "ja";
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
  const [events, setEvents] = useState<ReadonlyArray<EventRecord>>([]);
  const [workingChanges, setWorkingChanges] =
    useState<WorkingChanges>(loadStoredChanges);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [currentAccount, setCurrentAccount] = useState<AccountState | null>(
    null,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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

  // Fetch initial events from worker backend
  useEffect(() => {
    let cancelled = false;
    async function loadEvents(): Promise<void> {
      try {
        const res = await fetch("/definy.v1.EventService/GetEvents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 100, offset: 0 }),
        });
        if (!res.ok) {
          if (!cancelled) setConnectionStatus("error");
          return;
        }
        const data = (await res.json()) as {
          readonly events?: ReadonlyArray<EventRecord>;
        };
        if (!cancelled && data.events) {
          setEvents(data.events);
          setConnectionStatus("connected");
        }
      } catch {
        if (!cancelled) {
          setConnectionStatus("offline");
        }
      }
    }
    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive module and part snapshots from events and working changes
  const { modules, parts } = useMemo(() => {
    const moduleMap = new Map<string, ModuleSnapshot>();
    const partMap = new Map<string, PartSnapshot>();

    // Sort events ascending by time
    const sorted = [...events].sort((a, b) => a.timeMs - b.timeMs);

    for (const ev of sorted) {
      if (ev.eventType === "module_commit") {
        // Module commit logic can project parts
      }
    }

    return {
      modules: Array.from(moduleMap.values()),
      parts: Array.from(partMap.values()),
    };
  }, [events]);

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
      modules,
      parts,
      workingChanges,
      updateWorkingPart,
      discardWorkingPart,
      discardAllWorkingChanges,
      connectionStatus,
      currentAccount,
      setCurrentAccount,
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
      modules,
      parts,
      workingChanges,
      updateWorkingPart,
      discardWorkingPart,
      discardAllWorkingChanges,
      connectionStatus,
      currentAccount,
      sidebarOpen,
      toggleSidebar,
      commandPaletteOpen,
      evaluatePart,
    ],
  );

  return (
    <DefinyContext.Provider value={value}>{children}</DefinyContext.Provider>
  );
}

export function useDefiny(): DefinyContextValue {
  const ctx = useContext(DefinyContext);
  if (!ctx) {
    throw new Error("useDefiny must be used within a DefinyProvider");
  }
  return ctx;
}
