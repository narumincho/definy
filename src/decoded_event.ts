/**
 * SignedEvent (Base64) から, 表示に使うプロジェクトのコミットとアカウントの作成を読む. 署名は検証しない
 */
import { base64ToBytes, bytesToUrlSafeBase64NoPad } from "./base64.ts";
import { decodeCborItem, toUint8Array } from "./cbor.ts";
import {
  decodeEventContent,
  type EventContent,
  type LocalizedText,
  type Visibility,
} from "./event_content.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";

export type DecodedPart = {
  readonly name: string;
  readonly description: LocalizedText;
  /** 公開/非公開 (docs/visibility.md). 省くと公開 */
  readonly visibility?: Visibility;
  readonly partType: unknown;
  readonly expression?: unknown;
  /** 中身 (`core.part-content`) の content hash. 作ったばかりのパーツなら `null` (docs/content-addressed.md) */
  readonly contentHash?: string | null;
  /** 中身を CAS からまだ読んでいない (`description` などは空) */
  readonly unresolved?: true;
  readonly partIdHash?: string | null;
  /**
   * エディタで書いた定義の式 (docs/part-definition.md). あればコミットではこれを中身として預ける
   * (`description` などはこれを評価したもの). 無ければ `description` などから `core.define-part(...)` を作る
   */
  readonly definition?: unknown;
};

/** プロジェクトのコミットのモジュール */
export type DecodedModule = {
  readonly name: string;
  /** モジュール ID (モジュール名から導出, URL-safe Base64). アカウントが読めなければ `null` */
  readonly moduleIdHash: string | null;
  readonly description: LocalizedText;
  /** 公開/非公開 (docs/visibility.md) */
  readonly visibility: Visibility;
  readonly parts: ReadonlyArray<DecodedPart>;
};

/** プロジェクトのコミット (docs/project.md) */
export type DecodedProjectCommit = {
  readonly projectName: string;
  /** コミット先のブランチ (docs/branch.md) */
  readonly branch: string;
  readonly projectDescription: LocalizedText;
  readonly message: string;
  readonly parentCommitHash: string | null;
  /** このコミットで取り込んだ他のブランチのコミット (docs/branch.md「取り込み」) */
  readonly mergedCommitHash: string | null;
  readonly modules: ReadonlyArray<DecodedModule>;
};

/** SignedEvent (Base64) の内側のイベントの `account_id` (バイト列) と中身. 署名は検証しない */
function decodeInnerEvent(signedBytesBase64: string):
  | {
      readonly accountBytes: Uint8Array | undefined;
      readonly content: EventContent;
    }
  | undefined {
  const bytes = base64ToBytes(signedBytesBase64);
  const [signedRaw] = decodeCborItem(bytes);
  if (!signedRaw || typeof signedRaw !== "object") return undefined;
  const signedObj = signedRaw as Record<string, unknown>;
  const eventBinaryField = signedObj.event_binary as
    { value?: unknown } | undefined;
  const innerBytes = toUint8Array(eventBinaryField?.value ?? eventBinaryField);
  if (!innerBytes) return undefined;
  const [innerRaw] = decodeCborItem(innerBytes);
  if (!innerRaw || typeof innerRaw !== "object") return undefined;
  const innerObj = innerRaw as Record<string, unknown>;
  const content = decodeEventContent(innerObj.content);
  return content === undefined
    ? undefined
    : { accountBytes: toUint8Array(innerObj.account_id), content };
}

export function extractProjectCommit(
  signedBytesBase64: string,
): DecodedProjectCommit | null {
  try {
    const decoded = decodeInnerEvent(signedBytesBase64);
    if (decoded?.content.type !== "project_commit") return null;
    const { commit } = decoded.content;
    return {
      projectName: commit.projectName,
      branch: commit.branch,
      projectDescription: commit.projectDescription,
      message: commit.message,
      parentCommitHash: commit.parentCommitHash,
      mergedCommitHash: commit.mergedCommitHash,
      modules: commit.modules.map((module) => {
        const moduleIdBytes = decoded.accountBytes
          ? deriveModuleIdBytes(module.name)
          : null;
        return {
          name: module.name,
          moduleIdHash: moduleIdBytes
            ? bytesToUrlSafeBase64NoPad(moduleIdBytes)
            : null,
          description: module.description,
          visibility: module.visibility ?? "public",
          parts: module.parts.map((part) => ({
            ...part,
            partIdHash: moduleIdBytes
              ? deriveModulePartId(moduleIdBytes, part.name)
              : null,
          })),
        };
      }),
    };
  } catch {
    return null;
  }
}

type DecodedCreateAccount = {
  readonly accountId: string;
  readonly accountName: string;
};

/**
 * SignedEvent バイナリ（Base64）からアカウント作成情報（accountId, accountName）を抽出する
 */
export function extractCreateAccount(
  signedBytesBase64: string,
): DecodedCreateAccount | null {
  try {
    const decoded = decodeInnerEvent(signedBytesBase64);
    if (decoded?.content.type !== "create_account") return null;
    return {
      accountId: decoded.accountBytes
        ? bytesToUrlSafeBase64NoPad(decoded.accountBytes)
        : "",
      accountName: decoded.content.accountName,
    };
  } catch {
    return null;
  }
}
