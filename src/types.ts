/**
 * definy の TypeScript フロントエンド共通型定義
 */
import type { LocalizedText } from "./cbor.ts";
import type { EventVerification } from "./signed_event.ts";

export type LanguageCode = "en" | "ja" | "eo";

export type PartChange = {
  readonly moduleDefinitionEventHash: string;
  readonly partDefinitionEventHash: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly partType: unknown;
  readonly expression: unknown;
};

export type WorkingChanges = {
  readonly parts: ReadonlyMap<string, PartChange>;
};

export type ModulePartSnapshot = {
  readonly partId: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly partType: unknown;
  readonly contentHash?: string | null | undefined;
  readonly partIdHash?: string | null | undefined;
  readonly expression?: unknown | null | undefined;
};

export type ModuleSnapshot = {
  readonly moduleId: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly latestEventHash: string;
  readonly parentCommitHash?: string | null | undefined;
  readonly message: string;
  readonly parts: ReadonlyArray<ModulePartSnapshot>;
  readonly updatedAtMs: number;
};

export type PartSnapshot = {
  readonly partId: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly partType: unknown;
  readonly contentHash?: string | null | undefined;
  readonly partIdHash?: string | null | undefined;
  readonly expression?: unknown | null | undefined;
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
  readonly secretKeyBase64?: string | undefined;
};
