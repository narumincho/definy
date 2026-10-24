import { useCallback, useEffect, useState } from "react";
import type {
  AccountState,
  ModuleSnapshot,
  PartChange,
  WorkingChanges,
} from "../types.ts";
import {
  deserializeWorkingChanges,
  serializeWorkingChanges,
} from "../working_changes_storage.ts";
import { createSignedModuleCommitEvent, submitSignedEvent } from "../auth.ts";
import type { DecodedPart } from "../cbor.ts";
import {
  commitTarget,
  type BranchSummary,
  type CommitTarget,
} from "../branches.ts";
import { MAIN_BRANCH } from "../event_content.ts";
import { overlayWorkingChanges } from "../new_part.ts";

const STORAGE_KEY_CHANGES = "definy.working_changes.v4";

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
  readonly moduleName: string;
  readonly message: string;
  /** 表示しているブランチが他のアカウントのものなら, 作る新しいブランチの名前 (docs/branch.md) */
  readonly newBranchName?: string;
};

export type WorkingChangesParams = {
  readonly currentAccount: AccountState | null;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  /** モジュール名 → ブランチ. コミット先のブランチと親を決めるのに使う */
  readonly branchesByModule: ReadonlyMap<string, ReadonlyArray<BranchSummary>>;
  /** モジュール名 → 表示しているブランチ. 変更はこのブランチに重ねる */
  readonly displayedBranches: ReadonlyMap<string, string>;
  /** 新しいブランチにコミットしたら, そのブランチを表示する */
  readonly selectBranch: (moduleName: string, branch: string) => void;
  readonly refreshEvents: () => Promise<void>;
};

export type WorkingChangesOperations = {
  readonly workingChanges: WorkingChanges;
  readonly updateWorkingPart: (partId: string, change: PartChange) => void;
  readonly discardWorkingPart: (partId: string) => void;
  readonly discardAllWorkingChanges: () => void;
  readonly buildCommitParts: (moduleName: string) => {
    readonly existingModule: ModuleSnapshot | undefined;
    readonly partsList: ReadonlyArray<DecodedPart>;
    readonly committedPartIds: ReadonlySet<string>;
  };
  readonly commitWorkingChanges: (
    params: CommitWorkingChangesParams,
  ) => Promise<string>;
  /** `moduleName` へコミットする先 (docs/branch.md). ログインしていなければ `null` */
  readonly commitTargetFor: (moduleName: string) => CommitTarget | null;
};

export function useWorkingChanges({
  currentAccount,
  modules,
  branchesByModule,
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

      const { partsList, committedPartIds } = overlayWorkingChanges(
        moduleName,
        existingModule?.parts ?? [],
        workingChanges,
      );
      return { existingModule, partsList, committedPartIds };
    },
    [modules, workingChanges],
  );

  const commitTargetFor = useCallback(
    (moduleName: string): CommitTarget | null =>
      currentAccount === null
        ? null
        : commitTarget(
            branchesByModule.get(moduleName) ?? [],
            displayedBranches.get(moduleName) ?? MAIN_BRANCH,
            currentAccount.accountId,
            currentAccount.accountName,
          ),
    [currentAccount, branchesByModule, displayedBranches],
  );

  const commitWorkingChanges = useCallback(
    async ({
      moduleName,
      message,
      newBranchName,
    }: CommitWorkingChangesParams): Promise<string> => {
      if (!currentAccount || !currentAccount.secretKeyBase64) {
        throw new Error("You must be logged in to commit changes");
      }

      const { existingModule, partsList, committedPartIds } =
        buildCommitParts(moduleName);
      if (partsList.length === 0) {
        throw new Error(`No parts found to commit for module '${moduleName}'`);
      }
      // 表示しているブランチが自分のものならそこへ, 他のアカウントのものならそこから新しいブランチを作る
      // (他のアカウントのブランチにはコミットできない. docs/branch.md)
      const target = commitTargetFor(moduleName);
      if (target === null) {
        throw new Error("You must be logged in to commit changes");
      }
      const branch =
        target.kind === "new_module"
          ? MAIN_BRANCH
          : target.kind === "own_branch"
            ? target.branch
            : (newBranchName ?? target.suggestedName).trim();
      if (branch === "") {
        throw new Error("The branch name is empty");
      }
      if (
        target.kind === "new_branch" &&
        (branchesByModule.get(moduleName) ?? []).some((b) => b.name === branch)
      ) {
        throw new Error(
          `The branch '${branch}' already exists and was created by another account`,
        );
      }
      const parentCommitHash =
        target.kind === "new_module" ? null : target.parentCommitHash;

      const { signedEventBytes, eventHash } =
        await createSignedModuleCommitEvent({
          credentials: {
            accountId: currentAccount.accountId,
            accountName: currentAccount.accountName,
            secretKeyBase64: currentAccount.secretKeyBase64,
          },
          moduleName,
          branch,
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

      if (target.kind === "new_branch") {
        selectBranch(moduleName, branch);
      }
      await refreshEvents();
      return eventHash;
    },
    [
      currentAccount,
      buildCommitParts,
      commitTargetFor,
      branchesByModule,
      selectBranch,
      refreshEvents,
    ],
  );

  return {
    workingChanges,
    updateWorkingPart,
    discardWorkingPart,
    discardAllWorkingChanges,
    buildCommitParts,
    commitWorkingChanges,
    commitTargetFor,
  };
}
