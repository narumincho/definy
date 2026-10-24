/**
 * 署名済みイベントの中身 (`content`) を definy の値として作る・読む (docs/event.md).
 *
 * 中身の形は seeds/core.json の型パーツ `core.event-content` が決める. TypeScript の側は形を手で検査せず,
 * `npm run build:schema` が core の宣言から書き出す seeds/schemas/event-types.json と `conformsToTypeDeclaration`
 * (seed の検査と同じ関数) で確かめてから読む.
 */
import eventTypeDeclarations from "../seeds/schemas/event-types.json" with { type: "json" };
import type { LocalizedText } from "./cbor.ts";
import {
  field,
  none,
  optionValue,
  some,
  variant,
  variantOf,
} from "./definy_value.ts";
import { conformsToTypeDeclaration } from "./seed_schema.ts";

/** モジュールのコミットのパーツ (`core.module-commit-part`) */
export type CommitPart = {
  readonly name: string;
  readonly description: LocalizedText;
  /** パーツの型 (`core.type-ast` の値). 型指定が無ければ `null` */
  readonly partType: unknown;
  /** 式 (`core.expression` の値). CAS に預けているか, 式の無いパーツなら `null` */
  readonly expression: unknown;
  /** CAS に預けた式の content hash (URL-safe Base64). 式をそのまま持つなら `null` */
  readonly contentHash: string | null;
};

/** モジュールのコミット (`core.module-commit`) */
export type ModuleCommitContent = {
  readonly moduleName: string;
  readonly moduleDescription: LocalizedText;
  readonly message: string;
  readonly parentCommitHash: string | null;
  readonly parts: ReadonlyArray<CommitPart>;
};

/** イベントの中身 (`core.event-content`) */
export type EventContent =
  | { readonly type: "create_account"; readonly accountName: string }
  | { readonly type: "module_commit"; readonly commit: ModuleCommitContent };

export type EventType = EventContent["type"];

const declarations: Readonly<Record<string, unknown>> = eventTypeDeclarations;

const resolveTypePart = (name: string): unknown => declarations[name];

/** 値が `core.event-content` の形か */
export function isEventContent(value: unknown): boolean {
  return conformsToTypeDeclaration(
    value,
    resolveTypePart("core.event-content"),
    resolveTypePart,
    false,
  );
}

function optionOf(value: unknown): unknown {
  return value === null || value === undefined ? none() : some(value);
}

function encodeLocalizedText(text: LocalizedText): unknown {
  return text.map(({ language, text }) => ({ language, text }));
}

/** イベントの中身を definy の値 (`core.event-content`) にする */
export function encodeEventContent(content: EventContent): unknown {
  switch (content.type) {
    case "create_account":
      return variant("create_account", { account_name: content.accountName });
    case "module_commit": {
      const { commit } = content;
      return variant("module_commit", {
        module_name: commit.moduleName,
        module_description: encodeLocalizedText(commit.moduleDescription),
        message: commit.message,
        parent_commit_hash: optionOf(commit.parentCommitHash),
        parts: commit.parts.map((part) => ({
          name: part.name,
          description: encodeLocalizedText(part.description),
          part_type: optionOf(part.partType),
          expression: optionOf(part.expression),
          content_hash: optionOf(part.contentHash),
        })),
      });
    }
  }
}

function decodeLocalizedText(value: unknown): LocalizedText {
  return (Array.isArray(value) ? value : []).map((item) => ({
    language: String(field(item, "language")),
    text: String(field(item, "text")),
  }));
}

function optionOrNull(value: unknown): unknown {
  return optionValue(value) ?? null;
}

/** definy の値 (`core.event-content`) をイベントの中身にする. 形が違えば `undefined` */
export function decodeEventContent(value: unknown): EventContent | undefined {
  if (!isEventContent(value)) {
    return undefined;
  }
  const tagged = variantOf(value);
  const payload = tagged?.payload;
  switch (tagged?.tag) {
    case "create_account":
      return {
        type: "create_account",
        accountName: String(field(payload, "account_name")),
      };
    case "module_commit": {
      const parts = field(payload, "parts");
      const parentCommitHash = optionOrNull(
        field(payload, "parent_commit_hash"),
      );
      return {
        type: "module_commit",
        commit: {
          moduleName: String(field(payload, "module_name")),
          moduleDescription: decodeLocalizedText(
            field(payload, "module_description"),
          ),
          message: String(field(payload, "message")),
          parentCommitHash:
            typeof parentCommitHash === "string" ? parentCommitHash : null,
          parts: (Array.isArray(parts) ? parts : []).map((part) => {
            const contentHash = optionOrNull(field(part, "content_hash"));
            return {
              name: String(field(part, "name")),
              description: decodeLocalizedText(field(part, "description")),
              partType: optionOrNull(field(part, "part_type")),
              expression: optionOrNull(field(part, "expression")),
              contentHash: typeof contentHash === "string" ? contentHash : null,
            };
          }),
        },
      };
    }
  }
  return undefined;
}
