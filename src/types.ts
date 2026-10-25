/**
 * definy の TypeScript フロントエンド共通型定義
 */
import type { BranchSummary } from "./branches.ts";
import type { LocalizedText } from "./cbor.ts";
import type { Visibility } from "./event_content.ts";
import type { EventVerification } from "./signed_event.ts";

export type LanguageCode = "en" | "ja" | "eo";

export type PartChange = {
  readonly moduleDefinitionEventHash: string;
  readonly partDefinitionEventHash: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly partType: unknown;
  readonly expression: unknown;
  /** 公開/非公開を変える (docs/visibility.md). 省くとコミット済みのまま (新しいパーツは公開) */
  readonly visibility?: Visibility;
  /** パーツを削除する (コミットでモジュールから外す). docs/ui.md「パーツの作成と削除」 */
  readonly deleted?: boolean;
};

export type WorkingChanges = {
  readonly parts: ReadonlyMap<string, PartChange>;
  /**
   * プロジェクト名 → 取り込んでいる他のブランチのコミット. 次のそのプロジェクトのコミットが `merged_commit_hash` に持つ
   * (docs/branch.md「取り込み」)
   */
  readonly merges?: ReadonlyMap<string, string>;
  /**
   * まだコミットしていない新しいモジュールの名前 → 入れるプロジェクトの名前 (docs/project.md).
   * まだ無いプロジェクトなら, コミットするとプロジェクトができる
   */
  readonly newModuleProjects?: ReadonlyMap<string, string>;
  /** モジュール名 → 変えた公開/非公開 (docs/visibility.md) */
  readonly moduleVisibilities?: ReadonlyMap<string, Visibility>;
};

export type ModulePartSnapshot = {
  readonly partId: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly visibility: Visibility;
  readonly partType: unknown;
  readonly contentHash: string | null;
  readonly partIdHash: string | null;
  readonly expression: unknown | null;
};

export type ModuleSnapshot = {
  readonly moduleId: string;
  readonly name: string;
  /** モジュールが入っているプロジェクト (docs/project.md) */
  readonly projectName: string;
  /** プロジェクトの表示しているブランチ (docs/branch.md) */
  readonly branch: string;
  /** プロジェクトの全ブランチ (main が先頭) */
  readonly branches: ReadonlyArray<BranchSummary>;
  readonly description: LocalizedText;
  /** 公開/非公開 (docs/visibility.md) */
  readonly visibility: Visibility;
  readonly latestEventHash: string;
  readonly parentCommitHash: string | null;
  readonly message: string;
  readonly parts: ReadonlyArray<ModulePartSnapshot>;
  readonly updatedAtMs: number;
};

/** プロジェクトの, 表示しているブランチの最新のコミット (docs/project.md) */
export type ProjectSnapshot = {
  readonly name: string;
  /** 表示しているブランチ (docs/branch.md) */
  readonly branch: string;
  /** プロジェクトの全ブランチ (main が先頭) */
  readonly branches: ReadonlyArray<BranchSummary>;
  readonly description: LocalizedText;
  readonly latestEventHash: string;
  readonly parentCommitHash: string | null;
  readonly message: string;
  /** プロジェクトのモジュールの名前 (コミットの順) */
  readonly moduleNames: ReadonlyArray<string>;
  readonly updatedAtMs: number;
};

export type PartSnapshot = {
  readonly partId: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly name: string;
  readonly description: LocalizedText;
  /** 公開/非公開 (docs/visibility.md) */
  readonly visibility: Visibility;
  readonly partType: unknown;
  readonly contentHash: string | null;
  readonly partIdHash: string | null;
  readonly expression: unknown | null;
  readonly updatedAtMs: number;
};

export type EventRecord = {
  readonly eventHash: string;
  readonly signedEventBytes: string;
  readonly accountId: string;
  readonly eventType: string;
  readonly createdAtRfc3339: string;
  readonly timeMs: number;
  /**
   * ブラウザ側で署名・ハッシュ・メタデータを検証した結果。
   * `invalid` のイベントはモジュール・パーツ・アカウント名の導出には使わず、一覧で警告として表示する
   */
  readonly verification: EventVerification;
};

export type ConnectionStatus = "connected" | "connecting" | "offline" | "error";

export type AccountState = {
  readonly accountId: string;
  readonly accountName: string;
  readonly secretKeyBase64?: string;
};
