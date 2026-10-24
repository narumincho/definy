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
};

export type WorkingChangesParams = {
  readonly currentAccount: AccountState | null;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
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
};

export function useWorkingChanges({
  currentAccount,
  modules,
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

      await refreshEvents();
      return eventHash;
    },
    [currentAccount, buildCommitParts, refreshEvents],
  );

  return {
    workingChanges,
    updateWorkingPart,
    discardWorkingPart,
    discardAllWorkingChanges,
    buildCommitParts,
    commitWorkingChanges,
  };
}
