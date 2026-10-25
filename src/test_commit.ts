/**
 * テスト用: モジュール 1 つだけのプロジェクトのコミット (docs/project.md) を作る.
 * プロジェクト名を省くとモジュール名と同じにする
 */
import {
  createSignedProjectCommitEvent,
  type AccountCredentials,
  type SignedEventResult,
} from "./auth.ts";
import type { DecodedPart, LocalizedText } from "./cbor.ts";
import type { Visibility } from "./event_content.ts";

export function createSignedSingleModuleCommitEvent(
  params: {
    readonly credentials: AccountCredentials;
    readonly projectName?: string;
    readonly moduleName: string;
    readonly branch?: string;
    readonly moduleDescription: LocalizedText;
    /** 省くと公開 (docs/visibility.md) */
    readonly moduleVisibility?: Visibility;
    readonly message: string;
    readonly parentCommitHash?: string | null;
    readonly mergedCommitHash?: string | null;
    readonly parts: ReadonlyArray<DecodedPart>;
  },
  timeSeconds?: number,
): Promise<SignedEventResult> {
  return createSignedProjectCommitEvent(
    {
      credentials: params.credentials,
      projectName: params.projectName ?? params.moduleName,
      ...(params.branch === undefined ? {} : { branch: params.branch }),
      projectDescription: params.moduleDescription,
      message: params.message,
      parentCommitHash: params.parentCommitHash ?? null,
      mergedCommitHash: params.mergedCommitHash ?? null,
      modules: [
        {
          name: params.moduleName,
          description: params.moduleDescription,
          ...(params.moduleVisibility === undefined
            ? {}
            : { visibility: params.moduleVisibility }),
          parts: params.parts,
        },
      ],
    },
    timeSeconds,
  );
}
