import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AccountState,
  ModuleSnapshot,
  PartChange,
  ProjectSnapshot,
  WorkingChanges,
} from "../types.ts";
import { deserializeWorkingChanges } from "../working_changes_storage.ts";
import {
  createSignedProjectCommitEvent,
  submitProjectCommitEvent,
  type CommitModuleParams,
} from "../auth.ts";
import {
  commitTarget,
  unusedBranchName,
  type BranchSummary,
  type CommitTarget,
} from "../branches.ts";
import {
  DEFAULT_VISIBILITY,
  MAIN_BRANCH,
  type Visibility,
} from "../event_content.ts";
import { moduleOfPartId, overlayWorkingChanges } from "../new_part.ts";
import {
  combineActiveDraftChanges,
  draftKey,
  emptyWorkingChanges,
  hasDraftContent,
  isActiveDraft,
  isEmptyWorkingChanges,
  mergeWorkingChanges,
  splitWorkingChanges,
  type DraftCommit,
} from "../draft_commits.ts";
import {
  deserializeDraftStore,
  serializeDraftStore,
} from "../draft_commit_storage.ts";

const STORAGE_KEY_DRAFTS = "definy.draft_commits.v1";
/** ドラフトコミット導入前の, ブランチに属さない作業中の変更 (移行元) */
const STORAGE_KEY_LEGACY = "definy.working_changes.v5";

type DraftStore = {
  readonly drafts: ReadonlyMap<string, DraftCommit>;
  readonly legacy: WorkingChanges | null;
};

function loadDraftStore(): DraftStore {
  if (typeof window === "undefined") {
    return { drafts: new Map(), legacy: null };
  }
  const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
  if (raw) {
    const data = deserializeDraftStore(raw);
    return {
      drafts: new Map(
        data.drafts.map((d) => [
          draftKey(d.accountId, d.projectName, d.branch),
          d,
        ]),
      ),
      legacy: data.legacy,
    };
  }
  // v5 の変更は属するブランチが記録されていないので, 旧下書きとして引き継ぐ
  const legacyRaw = localStorage.getItem(STORAGE_KEY_LEGACY);
  if (legacyRaw) {
    const legacy = deserializeWorkingChanges(legacyRaw);
    if (!isEmptyWorkingChanges(legacy)) {
      return { drafts: new Map(), legacy };
    }
  }
  return { drafts: new Map(), legacy: null };
}

function saveDraftStore(store: DraftStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY_DRAFTS,
    serializeDraftStore({
      drafts: [...store.drafts.values()],
      legacy: store.legacy,
    }),
  );
}

export type CommitWorkingChangesParams = {
  readonly projectName: string;
  readonly message: string;
  /** 表示しているブランチが他のアカウントのものなら, 作る新しいブランチの名前 (docs/branch.md) */
  readonly newBranchName?: string;
  /**
   * 新しいブランチを作ってコミットする (エクスプローラーの「ブランチの追加」. docs/branch.md「ブランチの作成」).
   * 今のブランチのドラフトは元のブランチに残るので, このコミットには変更を含めない
   */
  readonly createBranch?: boolean;
};

/** プロジェクトのブランチで編集できるかどうか (docs/branch.md「ドラフトコミット」) */
export type BranchEditState =
  /** ログインしていない. 編集にはアカウントが要る */
  | { readonly kind: "no_account" }
  /** まだコミットが無いプロジェクト. 最初のコミットで `main` ができる */
  | { readonly kind: "new_project"; readonly branch: string }
  /** 表示しているブランチは自分が作ったもの. そのまま編集できる */
  | { readonly kind: "own_branch"; readonly branch: string }
  /** 表示しているブランチは他のアカウントのもの. 自分のブランチを作るまで編集できない */
  | {
      readonly kind: "other_branch";
      readonly branch: string;
      readonly suggestedName: string;
    };

type WorkingChangesParams = {
  readonly currentAccount: AccountState | null;
  readonly projects: ReadonlyArray<ProjectSnapshot>;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  /** プロジェクト名 → ブランチ. コミット先のブランチと親を決めるのに使う */
  readonly branchesByProject: ReadonlyMap<string, ReadonlyArray<BranchSummary>>;
  /** プロジェクト名 → 表示しているブランチ. ドラフトはこのブランチのものだけが有効になる */
  readonly displayedBranches: ReadonlyMap<string, string>;
  /** 新しいブランチにコミットしたら, そのブランチを表示する */
  readonly selectBranch: (projectName: string, branch: string) => void;
  readonly refreshEvents: () => Promise<void>;
};

/** プロジェクトにコミットするモジュール (今のモジュールに変更を重ねたもの) */
export type CommitModulesResult = {
  readonly project: ProjectSnapshot | undefined;
  readonly modules: ReadonlyArray<CommitModuleParams>;
  /** コミットに入れた変更のキー (コミットしたら消す) */
  readonly committedPartIds: ReadonlySet<string>;
  /** コミットに入れたモジュールの公開/非公開の変更のモジュール名 (コミットしたら消す) */
  readonly committedModuleVisibilities: ReadonlySet<string>;
  /** 変更のあるモジュールの名前 */
  readonly changedModuleNames: ReadonlySet<string>;
};

type WorkingChangesOperations = {
  /** 有効なドラフト (今のアカウントの, 表示しているブランチのもの) の変更を合成したもの */
  readonly workingChanges: WorkingChanges;
  /** ブランチに属していない旧下書き (v5 からの移行分). 移すまでは有効にならない */
  readonly legacyChanges: WorkingChanges | null;
  /** 今のアカウントの, 表示していないブランチに保留されているドラフト */
  readonly suspendedDrafts: ReadonlyArray<DraftCommit>;
  readonly updateWorkingPart: (partId: string, change: PartChange) => void;
  readonly discardWorkingPart: (partId: string) => void;
  /** 有効なドラフトをすべて破棄する (保留中のドラフトは残る) */
  readonly discardAllWorkingChanges: () => void;
  /** 新しいモジュール `moduleName` を入れるプロジェクトを決める (docs/project.md) */
  readonly setNewModuleProject: (
    moduleName: string,
    projectName: string,
  ) => void;
  /** モジュールの公開/非公開を変える. コミット済みと同じならその変更を消す (docs/visibility.md) */
  readonly setModuleVisibility: (
    moduleName: string,
    visibility: Visibility,
  ) => void;
  /** モジュールが入っている (新しいモジュールなら入れる) プロジェクト. 分からなければ `undefined` */
  readonly projectOfModule: (moduleName: string) => string | undefined;
  readonly buildCommitModules: (projectName: string) => CommitModulesResult;
  readonly commitWorkingChanges: (
    params: CommitWorkingChangesParams,
  ) => Promise<string>;
  /** `projectName` へコミットする先 (docs/branch.md). ログインしていなければ `null` */
  readonly commitTargetFor: (projectName: string) => CommitTarget | null;
  /** `projectName` の表示しているブランチで編集できるかどうか */
  readonly editStateFor: (projectName: string) => BranchEditState;
  /** プロジェクト・ブランチのドラフト. 無ければ `null` */
  readonly draftForBranch: (
    projectName: string,
    branch: string,
  ) => DraftCommit | null;
  /** `projectName` の表示しているブランチのドラフト. 無ければ `null` */
  readonly activeDraftFor: (projectName: string) => DraftCommit | null;
  /**
   * 表示しているブランチから自分のブランチを作る (初期コミットを送る. docs/branch.md).
   * 作ったブランチを表示し, その名前を返す
   */
  readonly createEditingBranch: (
    projectName: string,
    branchName?: string,
  ) => Promise<string>;
  /** ドラフトのコミットメッセージを保存する */
  readonly setDraftMessage: (projectName: string, message: string) => void;
  /** 保留中のドラフトを破棄する */
  readonly discardDraft: (projectName: string, branch: string) => void;
  /** 旧下書きのうち `projectName` のものを, 表示している自分のブランチのドラフトへ移す */
  readonly assignLegacyChanges: (projectName: string) => void;
  /** 旧下書きを破棄する (プロジェクトを省くとすべて) */
  readonly discardLegacyChanges: (projectName?: string) => void;
  readonly startMerge: (
    projectName: string,
    mergedCommitHash: string,
    changes: ReadonlyMap<string, PartChange>,
  ) => void;
  readonly cancelMerge: (projectName: string) => void;
};

/**
 * 変更 `workingChanges` を, プロジェクト `projectName` のモジュールに重ねる.
 * `projectOf` はモジュール名から入っているプロジェクトを返す. パーツの無くなったモジュールはコミットに入れない
 */
function overlayProjectChanges(
  projectName: string,
  project: ProjectSnapshot | undefined,
  modules: ReadonlyArray<ModuleSnapshot>,
  workingChanges: WorkingChanges,
  projectOf: (moduleName: string) => string | undefined,
): CommitModulesResult {
  const moduleNames = [...(project?.moduleNames ?? [])];
  for (const partId of workingChanges.parts.keys()) {
    const name = moduleOfPartId(partId);
    if (projectOf(name) === projectName && !moduleNames.includes(name)) {
      moduleNames.push(name);
    }
  }
  const committedPartIds = new Set<string>();
  const committedModuleVisibilities = new Set<string>();
  const changedModuleNames = new Set<string>();
  const commitModules: CommitModuleParams[] = [];
  for (const name of moduleNames) {
    const existing = modules.find((m) => m.name === name);
    const overlaid = overlayWorkingChanges(
      name,
      existing?.parts ?? [],
      workingChanges,
    );
    for (const id of overlaid.committedPartIds) {
      committedPartIds.add(id);
    }
    if (overlaid.committedPartIds.size > 0) {
      changedModuleNames.add(name);
    }
    const changedVisibility = workingChanges.moduleVisibilities?.get(name);
    if (changedVisibility !== undefined) {
      committedModuleVisibilities.add(name);
      changedModuleNames.add(name);
    }
    if (overlaid.partsList.length > 0) {
      commitModules.push({
        name,
        description: existing?.description ?? [],
        visibility:
          changedVisibility ?? existing?.visibility ?? DEFAULT_VISIBILITY,
        parts: overlaid.partsList,
      });
    }
  }
  return {
    project,
    modules: commitModules,
    committedPartIds,
    committedModuleVisibilities,
    changedModuleNames,
  };
}

export function useWorkingChanges({
  currentAccount,
  projects,
  modules,
  branchesByProject,
  displayedBranches,
  selectBranch,
  refreshEvents,
}: WorkingChangesParams): WorkingChangesOperations {
  const [store, setStore] = useState<DraftStore>(() => ({
    drafts: new Map(),
    legacy: null,
  }));

  useEffect(() => {
    setStore(loadDraftStore());
  }, []);

  const updateStore = useCallback((f: (prev: DraftStore) => DraftStore) => {
    setStore((prev) => {
      const next = f(prev);
      saveDraftStore(next);
      return next;
    });
  }, []);

  const accountId = currentAccount?.accountId ?? null;

  /** 有効なドラフトの変更の合成 (表示しているブランチのものだけ) */
  const workingChanges = useMemo(
    () =>
      combineActiveDraftChanges(
        store.drafts.values(),
        accountId,
        displayedBranches,
      ),
    [store.drafts, accountId, displayedBranches],
  );

  const suspendedDrafts = useMemo(
    () =>
      [...store.drafts.values()].filter(
        (draft) =>
          draft.accountId === accountId &&
          hasDraftContent(draft) &&
          !isActiveDraft(draft, accountId, displayedBranches),
      ),
    [store.drafts, accountId, displayedBranches],
  );

  const projectOfModule = useCallback(
    (moduleName: string): string | undefined => {
      const committed = modules.find((m) => m.name === moduleName)?.projectName;
      if (committed !== undefined) return committed;
      const active = workingChanges.newModuleProjects?.get(moduleName);
      if (active !== undefined) return active;
      if (accountId !== null) {
        for (const draft of store.drafts.values()) {
          if (draft.accountId !== accountId) continue;
          const project = draft.changes.newModuleProjects?.get(moduleName);
          if (project !== undefined) return project;
        }
      }
      return undefined;
    },
    [modules, workingChanges, store.drafts, accountId],
  );

  const draftForBranch = useCallback(
    (projectName: string, branch: string): DraftCommit | null =>
      accountId === null
        ? null
        : (store.drafts.get(draftKey(accountId, projectName, branch)) ?? null),
    [store.drafts, accountId],
  );

  const activeDraftFor = useCallback(
    (projectName: string): DraftCommit | null =>
      draftForBranch(
        projectName,
        displayedBranches.get(projectName) ?? MAIN_BRANCH,
      ),
    [draftForBranch, displayedBranches],
  );

  const editStateFor = useCallback(
    (projectName: string): BranchEditState => {
      if (currentAccount === null) return { kind: "no_account" };
      const branches = branchesByProject.get(projectName) ?? [];
      if (branches.length === 0) {
        return { kind: "new_project", branch: MAIN_BRANCH };
      }
      const displayed = displayedBranches.get(projectName) ?? MAIN_BRANCH;
      const summary =
        branches.find((b) => b.name === displayed) ?? branches[0]!;
      if (summary.creatorAccountId === currentAccount.accountId) {
        return { kind: "own_branch", branch: summary.name };
      }
      return {
        kind: "other_branch",
        branch: summary.name,
        suggestedName: unusedBranchName(branches, currentAccount.accountName),
      };
    },
    [currentAccount, branchesByProject, displayedBranches],
  );

  /** ドラフトを書き換える. 中身が無くなったドラフトは消す */
  const mutateDraft = useCallback(
    (
      projectName: string,
      branch: string,
      baseCommitHash: string | null,
      f: (draft: DraftCommit) => DraftCommit,
    ) => {
      if (accountId === null) return;
      updateStore((prev) => {
        const key = draftKey(accountId, projectName, branch);
        const existing = prev.drafts.get(key);
        const base: DraftCommit = existing ?? {
          accountId,
          projectName,
          branch,
          baseCommitHash,
          changes: emptyWorkingChanges(),
          message: "",
          updatedAtMs: 0,
        };
        const next = f(base);
        const nextDrafts = new Map(prev.drafts);
        if (!hasDraftContent(next)) {
          nextDrafts.delete(key);
        } else {
          nextDrafts.set(key, { ...next, updatedAtMs: Date.now() });
        }
        return { ...prev, drafts: nextDrafts };
      });
    },
    [accountId, updateStore],
  );

  /**
   * `projectName` の表示しているブランチのドラフトの変更を書き換える.
   * 自分のブランチ (または新しいプロジェクト) でなければ書き換えず `false` を返す
   */
  const updateActiveChanges = useCallback(
    (
      projectName: string,
      f: (changes: WorkingChanges) => WorkingChanges,
    ): boolean => {
      const state = editStateFor(projectName);
      if (state.kind !== "own_branch" && state.kind !== "new_project") {
        return false;
      }
      const branches = branchesByProject.get(projectName) ?? [];
      const summary = branches.find((b) => b.name === state.branch);
      mutateDraft(
        projectName,
        state.branch,
        summary?.latestEventHash ?? null,
        (draft) => ({ ...draft, changes: f(draft.changes) }),
      );
      return true;
    },
    [editStateFor, branchesByProject, mutateDraft],
  );

  const updateWorkingPart = useCallback(
    (partId: string, change: PartChange) => {
      const projectName =
        projectOfModule(moduleOfPartId(partId)) ?? moduleOfPartId(partId);
      updateActiveChanges(projectName, (prev) => ({
        ...prev,
        parts: new Map(prev.parts).set(partId, change),
      }));
    },
    [projectOfModule, updateActiveChanges],
  );

  const discardWorkingPart = useCallback(
    (partId: string) => {
      const projectName =
        projectOfModule(moduleOfPartId(partId)) ?? moduleOfPartId(partId);
      updateActiveChanges(projectName, (prev) => {
        const nextParts = new Map(prev.parts);
        nextParts.delete(partId);
        return { ...prev, parts: nextParts };
      });
    },
    [projectOfModule, updateActiveChanges],
  );

  const discardAllWorkingChanges = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      drafts: new Map(
        [...prev.drafts].filter(
          ([, draft]) => !isActiveDraft(draft, accountId, displayedBranches),
        ),
      ),
    }));
  }, [updateStore, accountId, displayedBranches]);

  const discardDraft = useCallback(
    (projectName: string, branch: string) => {
      if (accountId === null) return;
      updateStore((prev) => {
        const nextDrafts = new Map(prev.drafts);
        nextDrafts.delete(draftKey(accountId, projectName, branch));
        return { ...prev, drafts: nextDrafts };
      });
    },
    [accountId, updateStore],
  );

  const setNewModuleProject = useCallback(
    (moduleName: string, projectName: string) => {
      updateActiveChanges(projectName, (prev) => ({
        ...prev,
        newModuleProjects: new Map(prev.newModuleProjects).set(
          moduleName,
          projectName,
        ),
      }));
    },
    [updateActiveChanges],
  );

  const setModuleVisibility = useCallback(
    (moduleName: string, visibility: Visibility) => {
      const projectName = projectOfModule(moduleName);
      if (projectName === undefined) return;
      const committed =
        modules.find((m) => m.name === moduleName)?.visibility ??
        DEFAULT_VISIBILITY;
      updateActiveChanges(projectName, (prev) => {
        const next = new Map(prev.moduleVisibilities);
        if (visibility === committed) {
          next.delete(moduleName);
        } else {
          next.set(moduleName, visibility);
        }
        return { ...prev, moduleVisibilities: next };
      });
    },
    [modules, projectOfModule, updateActiveChanges],
  );

  const setDraftMessage = useCallback(
    (projectName: string, message: string) => {
      const state = editStateFor(projectName);
      if (state.kind !== "own_branch" && state.kind !== "new_project") return;
      const branches = branchesByProject.get(projectName) ?? [];
      const summary = branches.find((b) => b.name === state.branch);
      mutateDraft(
        projectName,
        state.branch,
        summary?.latestEventHash ?? null,
        (draft) => ({ ...draft, message }),
      );
    },
    [editStateFor, branchesByProject, mutateDraft],
  );

  /** `projectName` にドラフトをコミットするときのモジュール (今のモジュールにドラフトの変更を重ねたもの) */
  const buildCommitModules = useCallback(
    (projectName: string): CommitModulesResult =>
      overlayProjectChanges(
        projectName,
        projects.find((p) => p.name === projectName),
        modules,
        activeDraftFor(projectName)?.changes ?? emptyWorkingChanges(),
        projectOfModule,
      ),
    [projects, modules, activeDraftFor, projectOfModule],
  );

  const commitTargetFor = useCallback(
    (projectName: string): CommitTarget | null =>
      currentAccount === null
        ? null
        : commitTarget(
            branchesByProject.get(projectName) ?? [],
            displayedBranches.get(projectName) ?? MAIN_BRANCH,
            currentAccount.accountId,
            currentAccount.accountName,
          ),
    [currentAccount, branchesByProject, displayedBranches],
  );

  const commitWorkingChanges = useCallback(
    async ({
      projectName,
      message,
      newBranchName,
      createBranch = false,
    }: CommitWorkingChangesParams): Promise<string> => {
      if (!currentAccount || !currentAccount.secretKeyBase64) {
        throw new Error("You must be logged in to commit changes");
      }

      // ブランチ作成のコミットには今のブランチのドラフトを含めない (ドラフトは元のブランチに残る)
      const committedDraft = createBranch ? null : activeDraftFor(projectName);
      const { project, modules: commitModules } = overlayProjectChanges(
        projectName,
        projects.find((p) => p.name === projectName),
        modules,
        committedDraft?.changes ?? emptyWorkingChanges(),
        projectOfModule,
      );
      if (commitModules.length === 0) {
        throw new Error(
          `No parts found to commit for project '${projectName}'`,
        );
      }
      // 表示しているブランチが自分のものならそこへ, 他のアカウントのものならそこから新しいブランチを作る
      // (他のアカウントのブランチにはコミットできない. docs/branch.md)
      const shownTarget = commitTargetFor(projectName);
      if (shownTarget === null) {
        throw new Error("You must be logged in to commit changes");
      }
      // 新しいブランチを作るときは, 表示しているブランチの最新のコミットから分ける
      const target: CommitTarget =
        createBranch && shownTarget.kind === "own_branch"
          ? {
              kind: "new_branch",
              fromBranch: shownTarget.branch,
              parentCommitHash: shownTarget.parentCommitHash,
              suggestedName: newBranchName ?? "",
            }
          : shownTarget;
      const branch =
        target.kind === "new_project"
          ? MAIN_BRANCH
          : target.kind === "own_branch"
            ? target.branch
            : (newBranchName ?? target.suggestedName).trim();
      if (branch === "") {
        throw new Error("The branch name is empty");
      }
      if (
        target.kind === "new_branch" &&
        (branchesByProject.get(projectName) ?? []).some(
          (b) => b.name === branch,
        )
      ) {
        throw new Error(`The branch '${branch}' already exists`);
      }
      const parentCommitHash =
        target.kind === "new_project" ? null : target.parentCommitHash;
      // コミットにはパーツの中身の content hash だけを入れ, サーバーに無い中身だけを送る
      const { signedEventBytes, eventHash, contents } =
        await createSignedProjectCommitEvent({
          credentials: {
            accountId: currentAccount.accountId,
            accountName: currentAccount.accountName,
            secretKeyBase64: currentAccount.secretKeyBase64,
          },
          projectName,
          branch,
          projectDescription: project?.description ?? [],
          message,
          parentCommitHash,
          // 取り込みは自分のブランチへのコミットだけ (新しいブランチ・プロジェクトには入れない)
          mergedCommitHash:
            target.kind === "own_branch"
              ? (committedDraft?.changes.merges?.get(projectName) ?? null)
              : null,
          modules: commitModules,
        });

      const submitRes = await submitProjectCommitEvent(
        signedEventBytes,
        contents,
      );
      if (submitRes.status !== "accepted") {
        throw new Error(`Commit rejected with status: ${submitRes.status}`);
      }

      // コミットしたドラフトは消える (ブランチ作成のときは元のブランチに残る)
      if (committedDraft !== null) {
        updateStore((prev) => {
          const nextDrafts = new Map(prev.drafts);
          nextDrafts.delete(
            draftKey(
              committedDraft.accountId,
              committedDraft.projectName,
              committedDraft.branch,
            ),
          );
          return { ...prev, drafts: nextDrafts };
        });
      }

      if (target.kind === "new_branch") {
        selectBranch(projectName, branch);
      }
      await refreshEvents();
      return eventHash;
    },
    [
      currentAccount,
      activeDraftFor,
      projects,
      modules,
      projectOfModule,
      commitTargetFor,
      branchesByProject,
      selectBranch,
      refreshEvents,
      updateStore,
    ],
  );

  const createEditingBranch = useCallback(
    async (projectName: string, branchName?: string): Promise<string> => {
      if (!currentAccount) {
        throw new Error("You must be logged in to create a branch");
      }
      const branches = branchesByProject.get(projectName) ?? [];
      const name = (
        branchName ?? unusedBranchName(branches, currentAccount.accountName)
      ).trim();
      if (name === "") {
        throw new Error("The branch name is empty");
      }
      const displayed = displayedBranches.get(projectName) ?? MAIN_BRANCH;
      await commitWorkingChanges({
        projectName,
        message: `Create branch ${name} from ${displayed}`,
        newBranchName: name,
        createBranch: true,
      });
      return name;
    },
    [
      currentAccount,
      branchesByProject,
      displayedBranches,
      commitWorkingChanges,
    ],
  );

  const assignLegacyChanges = useCallback(
    (projectName: string) => {
      const legacy = store.legacy;
      if (legacy === null) return;
      const projectOf = (moduleName: string): string | undefined =>
        modules.find((m) => m.name === moduleName)?.projectName ??
        legacy.newModuleProjects?.get(moduleName);
      const { inProject, rest } = splitWorkingChanges(
        legacy,
        projectName,
        projectOf,
      );
      if (isEmptyWorkingChanges(inProject)) return;
      // 既にあるドラフト側を優先して合成する (旧下書きのほうが古い)
      const assigned = updateActiveChanges(projectName, (prev) =>
        mergeWorkingChanges(inProject, prev),
      );
      if (!assigned) return;
      updateStore((prev) => ({
        ...prev,
        legacy: isEmptyWorkingChanges(rest) ? null : rest,
      }));
    },
    [store.legacy, modules, updateActiveChanges, updateStore],
  );

  const discardLegacyChanges = useCallback(
    (projectName?: string) => {
      if (projectName === undefined) {
        updateStore((prev) => ({ ...prev, legacy: null }));
        return;
      }
      const legacy = store.legacy;
      if (legacy === null) return;
      const projectOf = (moduleName: string): string | undefined =>
        modules.find((m) => m.name === moduleName)?.projectName ??
        legacy.newModuleProjects?.get(moduleName);
      const { rest } = splitWorkingChanges(legacy, projectName, projectOf);
      updateStore((prev) => ({
        ...prev,
        legacy: isEmptyWorkingChanges(rest) ? null : rest,
      }));
    },
    [store.legacy, modules, updateStore],
  );

  /**
   * 他のブランチのコミット `mergedCommitHash` の取り込みを始める: 取り込んだ後のパーツへの変更を
   * main のドラフトにし, 次の main へのコミットで `merged_commit_hash` に入れる
   */
  const startMerge = useCallback(
    (
      projectName: string,
      mergedCommitHash: string,
      changes: ReadonlyMap<string, PartChange>,
    ) => {
      const main = (branchesByProject.get(projectName) ?? []).find(
        (b) => b.name === MAIN_BRANCH,
      );
      mutateDraft(
        projectName,
        MAIN_BRANCH,
        main?.latestEventHash ?? null,
        (draft) => {
          const knownModules = new Set(modules.map((m) => m.name));
          const newModuleProjects = new Map(draft.changes.newModuleProjects);
          for (const partId of changes.keys()) {
            const name = moduleOfPartId(partId);
            if (!knownModules.has(name)) {
              newModuleProjects.set(name, projectName);
            }
          }
          return {
            ...draft,
            changes: {
              ...draft.changes,
              parts: new Map([...draft.changes.parts, ...changes]),
              merges: new Map(draft.changes.merges).set(
                projectName,
                mergedCommitHash,
              ),
              newModuleProjects,
            },
          };
        },
      );
    },
    [branchesByProject, modules, mutateDraft],
  );

  /** 取り込みをやめる (main のドラフトを捨てる) */
  const cancelMerge = useCallback(
    (projectName: string) => {
      discardDraft(projectName, MAIN_BRANCH);
    },
    [discardDraft],
  );

  return {
    workingChanges,
    legacyChanges: store.legacy,
    suspendedDrafts,
    updateWorkingPart,
    discardWorkingPart,
    discardAllWorkingChanges,
    setNewModuleProject,
    setModuleVisibility,
    projectOfModule,
    buildCommitModules,
    commitWorkingChanges,
    commitTargetFor,
    editStateFor,
    draftForBranch,
    activeDraftFor,
    createEditingBranch,
    setDraftMessage,
    discardDraft,
    assignLegacyChanges,
    discardLegacyChanges,
    startMerge,
    cancelMerge,
  };
}
