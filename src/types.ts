/**
 * definy の TypeScript フロントエンド共通型定義
 */
import type { LocalizedText } from "./cbor.ts";

export type LanguageCode = "en" | "ja" | "eo";

export interface PartChange {
  readonly moduleDefinitionEventHash: string;
  readonly partDefinitionEventHash: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly partType: unknown;
  readonly expression: unknown;
}

export interface WorkingChanges {
  readonly parts: ReadonlyMap<string, PartChange>;
}

export interface ModulePartSnapshot {
  readonly partId: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly partType: unknown;
  readonly contentHash?: string | null;
  readonly expression?: unknown | null;
}

export interface ModuleSnapshot {
  readonly moduleId: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly latestEventHash: string;
  readonly parentCommitHash?: string | null;
  readonly message: string;
  readonly parts: ReadonlyArray<ModulePartSnapshot>;
  readonly updatedAtMs: number;
}

export interface PartSnapshot {
  readonly partId: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly partType: unknown;
  readonly contentHash?: string | null;
  readonly expression?: unknown | null;
  readonly updatedAtMs: number;
}

export interface EventRecord {
  readonly eventHash: string;
  readonly signedEventBytes: string;
  readonly accountId: string;
  readonly eventType: string;
  readonly createdAtRfc3339: string;
  readonly timeMs: number;
}

export type ConnectionStatus = "connected" | "connecting" | "offline" | "error";

export interface AccountState {
  readonly accountId: string;
  readonly accountName: string;
  readonly secretKeyBase64?: string;
}
