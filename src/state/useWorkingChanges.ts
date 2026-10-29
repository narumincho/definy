import { useCallback, useEffect, useState } from "react";
import type {
  AccountState,
  ModuleSnapshot,
  PartChange,
  ProjectSnapshot,
  WorkingChanges,
} from "../types.ts";
import {
  deserializeWorkingChanges,
  serializeWorkingChanges,
} from "../working_changes_storage.ts";
import {
  createSignedProjectCommitEvent,
  submitProjectCommitEvent,
  type CommitModuleParams,
} from "../auth.ts";
import {
  commitTarget,
  type BranchSummary,
  type CommitTarget,
} from "../branches.ts";
import {
  DEFAULT_VISIBILITY,
  MAIN_BRANCH,
  type Visibility,
} from "../event_content.ts";
import { moduleOfPartId, overlayWorkingChanges } from "../new_part.ts";

const STORAGE_KEY_CHANGES = "definy.working_changes.v5";

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

export type CommitWorkingChangesParams = {
  readonly projectName: string;
  readonly message: string;
  /** 表示しているブランチが他のアカウントのものなら, 作る新しいブランチの名前 (docs/branch.md) */
  readonly newBranchName?: string;
  /**
   * 自分のブランチを表示していても `newBranchName` の新しいブランチを作ってコミットする
   * (エクスプローラーの「ブランチの追加」. docs/branch.md「ブランチの作成」)
   */
  readonly createBranch?: boolean;
};

export type WorkingChangesParams = {
  readonly currentAccount: AccountState | null;
  readonly projects: ReadonlyArray<ProjectSnapshot>;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  /** プロジェクト名 → ブランチ. コミット先のブランチと親を決めるのに使う */
  readonly branchesByProject: ReadonlyMap<string, ReadonlyArray<BranchSummary>>;
  /** プロジェクト名 → 表示しているブランチ. 変更はこのブランチに重ねる */
  readonly displayedBranches: ReadonlyMap<string, string>;
  /** 新しいブランチにコミットしたら, そのブランチを表示する */
  readonly selectBranch: (projectName: string, branch: string) => void;
  readonly refreshEvents: () => Promise<void>;
};

/** プロジェクトにコミットするモジュール (今のモジュールに作業中の変更を重ねたもの) */
export type CommitModulesResult = {
  readonly project: ProjectSnapshot | undefined;
  readonly modules: ReadonlyArray<CommitModuleParams>;
  /** コミットに入れた作業中の変更のキー (コミットしたら消す) */
  readonly committedPartIds: ReadonlySet<string>;
  /** コミットに入れたモジュールの公開/非公開の変更のモジュール名 (コミットしたら消す) */
  readonly committedModuleVisibilities: ReadonlySet<string>;
  /** 作業中の変更のあるモジュールの名前 */
  readonly changedModuleNames: ReadonlySet<string>;
};

export type WorkingChangesOperations = {
  readonly workingChanges: WorkingChanges;
  readonly updateWorkingPart: (partId: string, change: PartChange) => void;
  readonly discardWorkingPart: (partId: string) => void;
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
  readonly startMerge: (
    projectName: string,
    mergedCommitHash: string,
    changes: ReadonlyMap<string, PartChange>,
  ) => void;
  readonly cancelMerge: (projectName: string) => void;
};

/**
 * 作業中の変更 `workingChanges` を, プロジェクト `projectName` のモジュールに重ねる.
 * `projectOf` はモジュール名から入っているプロジェクトを返す. パーツの無くなったモジュールはコミットに入れない
 */
export function overlayProjectChanges(
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
  const [workingChanges, setWorkingChanges] = useState<WorkingChanges>(() => ({
    parts: new Map<string, PartChange>(),
  }));

  useEffect(() => {
    setWorkingChanges(loadStoredChanges());
  }, []);

  const update = useCallback((f: (prev: WorkingChanges) => WorkingChanges) => {
    setWorkingChanges((prev) => {
      const next = f(prev);
      saveStoredChanges(next);
      return next;
    });
  }, []);

  const updateWorkingPart = useCallback(
    (partId: string, change: PartChange) => {
      update((prev) => ({
        ...prev,
        parts: new Map(prev.parts).set(partId, change),
      }));
    },
    [update],
  );

  const discardWorkingPart = useCallback(
    (partId: string) => {
      update((prev) => {
        const nextParts = new Map<string, PartChange>(prev.parts);
        nextParts.delete(partId);
        return { ...prev, parts: nextParts };
      });
    },
    [update],
  );

  const discardAllWorkingChanges = useCallback(() => {
    update(() => ({ parts: new Map<string, PartChange>() }));
  }, [update]);

  const setNewModuleProject = useCallback(
    (moduleName: string, projectName: string) => {
      update((prev) => ({
        ...prev,
        newModuleProjects: new Map(prev.newModuleProjects).set(
          moduleName,
          projectName,
        ),
      }));
    },
    [update],
  );

  const setModuleVisibility = useCallback(
    (moduleName: string, visibility: Visibility) => {
      const committed =
        modules.find((m) => m.name === moduleName)?.visibility ??
        DEFAULT_VISIBILITY;
      update((prev) => {
        const next = new Map(prev.moduleVisibilities);
        if (visibility === committed) {
          next.delete(moduleName);
        } else {
          next.set(moduleName, visibility);
        }
        return { ...prev, moduleVisibilities: next };
      });
    },
    [modules, update],
  );

  const projectOfModule = useCallback(
    (moduleName: string): string | undefined =>
      modules.find((m) => m.name === moduleName)?.projectName ??
      workingChanges.newModuleProjects?.get(moduleName),
    [modules, workingChanges],
  );

  /** `projectName` に作業中の変更をコミットするときのモジュール (今のモジュールに変更を重ねたもの) */
  const buildCommitModules = useCallback(
    (projectName: string): CommitModulesResult =>
      overlayProjectChanges(
        projectName,
        projects.find((p) => p.name === projectName),
        modules,
        workingChanges,
        projectOfModule,
      ),
    [projects, modules, workingChanges, projectOfModule],
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

      const {
        project,
        modules: commitModules,
        committedPartIds,
        committedModuleVisibilities,
      } = buildCommitModules(projectName);
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
              ? (workingChanges.merges?.get(projectName) ?? null)
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

      const committedModuleNames = new Set(commitModules.map((m) => m.name));
      update((prev) => {
        const nextParts = new Map<string, PartChange>(prev.parts);
        for (const id of committedPartIds) {
          nextParts.delete(id);
        }
        const nextMerges = new Map(prev.merges);
        nextMerges.delete(projectName);
        const nextNewModuleProjects = new Map(prev.newModuleProjects);
        for (const [name, p] of prev.newModuleProjects ?? []) {
          if (p === projectName && committedModuleNames.has(name)) {
            nextNewModuleProjects.delete(name);
          }
        }
        const nextModuleVisibilities = new Map(prev.moduleVisibilities);
        for (const name of committedModuleVisibilities) {
          nextModuleVisibilities.delete(name);
        }
        return {
          parts: nextParts,
          merges: nextMerges,
          newModuleProjects: nextNewModuleProjects,
          moduleVisibilities: nextModuleVisibilities,
        };
      });

      if (target.kind === "new_branch") {
        selectBranch(projectName, branch);
      }
      await refreshEvents();
      return eventHash;
    },
    [
      currentAccount,
      buildCommitModules,
      commitTargetFor,
      branchesByProject,
      selectBranch,
      refreshEvents,
      workingChanges,
      update,
    ],
  );

  /**
   * 他のブランチのコミット `mergedCommitHash` の取り込みを始める: 取り込んだ後のパーツへの変更 (`changes`) を作業中の変更にし,
   * 次のコミットで `merged_commit_hash` に入れる. 取り込むブランチにだけあるモジュールはこのプロジェクトの新しいモジュールにする
   */
  const startMerge = useCallback(
    (
      projectName: string,
      mergedCommitHash: string,
      changes: ReadonlyMap<string, PartChange>,
    ) => {
      const knownModules = new Set(modules.map((m) => m.name));
      update((prev) => {
        const newModuleProjects = new Map(prev.newModuleProjects);
        for (const partId of changes.keys()) {
          const name = moduleOfPartId(partId);
          if (!knownModules.has(name)) {
            newModuleProjects.set(name, projectName);
          }
        }
        return {
          ...prev,
          parts: new Map([...prev.parts, ...changes]),
          merges: new Map(prev.merges).set(projectName, mergedCommitHash),
          newModuleProjects,
        };
      });
    },
    [modules, update],
  );

  /** 取り込みをやめる (そのプロジェクトの作業中の変更も捨てる) */
  const cancelMerge = useCallback(
    (projectName: string) => {
      update((prev) => {
        const nextMerges = new Map(prev.merges);
        nextMerges.delete(projectName);
        const inProject = (moduleName: string): boolean =>
          (modules.find((m) => m.name === moduleName)?.projectName ??
            prev.newModuleProjects?.get(moduleName)) === projectName;
        return {
          ...prev,
          parts: new Map(
            [...prev.parts].filter(
              ([partId]) => !inProject(moduleOfPartId(partId)),
            ),
          ),
          merges: nextMerges,
          newModuleProjects: new Map(
            [...(prev.newModuleProjects ?? [])].filter(
              ([, p]) => p !== projectName,
            ),
          ),
        };
      });
    },
    [modules, update],
  );

  return {
    workingChanges,
    updateWorkingPart,
    discardWorkingPart,
    discardAllWorkingChanges,
    setNewModuleProject,
    setModuleVisibility,
    projectOfModule,
    buildCommitModules,
    commitWorkingChanges,
    commitTargetFor,
    startMerge,
    cancelMerge,
  };
}
