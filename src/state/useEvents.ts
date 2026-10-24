import { useCallback, useEffect, useMemo, useState } from "react";
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
  moduleBranches,
  type BranchSummary,
} from "../branches.ts";
import type { LatestPart } from "../self_hosted_type_check.ts";

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
        // 全パーツの式のハッシュを毎回計算すると重い (seed の core だけで数 MB) ので, どのイベントの定義かで表す.
        // 同じ式でもコミットし直すと別のキーになり検査し直すが, 結果は変わらない
        expressionKey: `${eventHash}:${part.name}`,
      });
    }
  }
  return parts;
}

export type EventsState = {
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

export function useEvents(): EventsState {
  const [events, setEvents] = useState<ReadonlyArray<EventRecord>>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  // Fetch events from worker backend
  const refreshEvents = useCallback(async (): Promise<void> => {
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
    void refreshEvents();
  }, [refreshEvents]);

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
        const commit = extractModuleCommit(event.signedEventBytes);
        return commit === null ? [] : [{ event, commit }];
      }),
    [validEvents],
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
      const branchCommits = decodedCommits.map(({ event, commit }) => ({
        accountId: event.accountId,
        moduleName: commit.moduleName,
        branch: commit.branch,
        eventHash: event.eventHash,
        timeMs: event.timeMs,
      }));
      const branchesMap = new Map<string, ReadonlyArray<BranchSummary>>();
      const displayedMap = new Map<string, string>();
      for (const moduleName of new Set(
        decodedCommits.map(({ commit }) => commit.moduleName),
      )) {
        const branches = moduleBranches(branchCommits, moduleName);
        branchesMap.set(moduleName, branches);
        displayedMap.set(
          moduleName,
          displayedBranch(branches, selectedBranches.get(moduleName)),
        );
      }
      return {
        branchesByModule: branchesMap,
        displayedBranches: displayedMap,
        displayedCommits: decodedCommits.filter(
          ({ commit }) => displayedMap.get(commit.moduleName) === commit.branch,
        ),
      };
    }, [decodedCommits, selectedBranches]);

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
  };
}
