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

/** プロジェクトのコミットのモジュールのパーツ (`core.module-commit-part`) */
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

/** プロジェクトを作ったときのブランチ. プロジェクトの作成者だけがコミットできる (docs/branch.md) */
export const MAIN_BRANCH = "main";

/** プロジェクトのコミットのモジュール (`core.project-commit-module`) */
export type CommitModule = {
  readonly name: string;
  readonly description: LocalizedText;
  readonly parts: ReadonlyArray<CommitPart>;
};

/** プロジェクトのコミット (`core.project-commit`. docs/project.md) */
export type ProjectCommitContent = {
  readonly projectName: string;
  /** コミットするブランチの名前. プロジェクトを作った最初のコミットは `main` (docs/branch.md) */
  readonly branch: string;
  readonly projectDescription: LocalizedText;
  readonly message: string;
  readonly parentCommitHash: string | null;
  /** このコミットで取り込んだ他のブランチのコミット. 取り込みでなければ `null` (docs/branch.md「取り込み」) */
  readonly mergedCommitHash: string | null;
  /** その時点のプロジェクトのモジュールすべて */
  readonly modules: ReadonlyArray<CommitModule>;
};

/** イベントの中身 (`core.event-content`) */
export type EventContent =
  | { readonly type: "create_account"; readonly accountName: string }
  | { readonly type: "project_commit"; readonly commit: ProjectCommitContent };

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

/** 値が `core.expression` の形か (CAS に預けた式を検査する. イベントの中の式は `isEventContent` が検査する) */
export function isExpression(value: unknown): boolean {
  return conformsToTypeDeclaration(
    value,
    resolveTypePart("core.expression"),
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
    case "project_commit": {
      const { commit } = content;
      return variant("project_commit", {
        project_name: commit.projectName,
        branch: commit.branch,
        project_description: encodeLocalizedText(commit.projectDescription),
        message: commit.message,
        parent_commit_hash: optionOf(commit.parentCommitHash),
        merged_commit_hash: optionOf(commit.mergedCommitHash),
        modules: commit.modules.map((module) => ({
          name: module.name,
          description: encodeLocalizedText(module.description),
          parts: module.parts.map((part) => ({
            name: part.name,
            description: encodeLocalizedText(part.description),
            part_type: optionOf(part.partType),
            expression: optionOf(part.expression),
            content_hash: optionOf(part.contentHash),
          })),
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

function decodeParts(value: unknown): ReadonlyArray<CommitPart> {
  return (Array.isArray(value) ? value : []).map((part) => {
    const contentHash = optionOrNull(field(part, "content_hash"));
    return {
      name: String(field(part, "name")),
      description: decodeLocalizedText(field(part, "description")),
      partType: optionOrNull(field(part, "part_type")),
      expression: optionOrNull(field(part, "expression")),
      contentHash: typeof contentHash === "string" ? contentHash : null,
    };
  });
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
    case "project_commit": {
      const modules = field(payload, "modules");
      const parentCommitHash = optionOrNull(
        field(payload, "parent_commit_hash"),
      );
      const mergedCommitHash = optionOrNull(
        field(payload, "merged_commit_hash"),
      );
      return {
        type: "project_commit",
        commit: {
          projectName: String(field(payload, "project_name")),
          branch: String(field(payload, "branch")),
          projectDescription: decodeLocalizedText(
            field(payload, "project_description"),
          ),
          message: String(field(payload, "message")),
          parentCommitHash:
            typeof parentCommitHash === "string" ? parentCommitHash : null,
          mergedCommitHash:
            typeof mergedCommitHash === "string" ? mergedCommitHash : null,
          modules: (Array.isArray(modules) ? modules : []).map((module) => ({
            name: String(field(module, "name")),
            description: decodeLocalizedText(field(module, "description")),
            parts: decodeParts(field(module, "parts")),
          })),
        },
      };
    }
  }
  return undefined;
}
