/**
 * 署名済みイベントの中身 (`content`) を definy の値として作る・読む (docs/event.md).
 *
 * 中身の形は seeds/core.json の型パーツ `core.event-content` が決める. TypeScript の側は形を手で検査せず,
 * `npm run build:schema` が core の宣言から書き出す seeds/schemas/event-types.json と `conformsToTypeDeclaration`
 * (seed の検査と同じ関数) で確かめてから読む.
 */
import eventTypeDeclarations from "../seeds/schemas/event-types.json" with { type: "json" };
import {
  field,
  none,
  optionValue,
  some,
  variant,
  variantOf,
} from "./definy_value.ts";
import { conformsToTypeDeclaration } from "./seed_schema.ts";

/** 言語ごとのテキスト (`[{ language: "en", text: "..." }, ...]`) */
export type LocalizedTextEntry = {
  readonly language: string;
  readonly text: string;
};

export type LocalizedText = ReadonlyArray<LocalizedTextEntry>;

/**
 * モジュールやパーツを外から参照できるか (`core.visibility`. docs/visibility.md).
 * 非公開のモジュールは同じプロジェクトから, 非公開のパーツは同じモジュールからだけ参照できる
 */
export type Visibility = "public" | "private";

/** 公開/非公開を省いたときの既定 */
export const DEFAULT_VISIBILITY: Visibility = "public";

/** パーツの中身 (`core.part-content`). CAS に預け, コミットには content hash だけを書く (docs/content-addressed.md) */
export type PartContent = {
  readonly description: LocalizedText;
  /** 省くと公開 */
  readonly visibility?: Visibility;
  /** パーツの型 (型の式. `core.expression` の値. docs/type-expression.md). 型指定が無ければ `null` */
  readonly partType: unknown;
  /** 式 (`core.expression` の値). 式の無いパーツなら `null` */
  readonly expression: unknown;
};

/**
 * プロジェクトのコミットのモジュールのパーツ. イベント (`core.module-commit-part`) には名前と中身の content hash だけが入り,
 * 中身は CAS から読んで埋める. `unresolved` なら中身をまだ読んでいない (`description` などは空)
 */
export type CommitPart = PartContent & {
  readonly name: string;
  /** 中身 (`core.part-content`) の CBOR の SHA-256 (URL-safe Base64). 作ったばかりで決めていなければ `null` */
  readonly contentHash: string | null;
  readonly unresolved?: true;
};

/** プロジェクトを作ったときのブランチ. プロジェクトの作成者だけがコミットできる (docs/branch.md) */
export const MAIN_BRANCH = "main";

/** プロジェクトのコミットのモジュール (`core.project-commit-module`) */
export type CommitModule = {
  readonly name: string;
  readonly description: LocalizedText;
  /** 省くと公開 */
  readonly visibility?: Visibility;
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

function optionOf(value: unknown): unknown {
  return value === null || value === undefined ? none() : some(value);
}

function encodeVisibility(visibility: Visibility | undefined): unknown {
  return variant(visibility ?? DEFAULT_VISIBILITY);
}

function decodeVisibility(value: unknown): Visibility {
  return variantOf(value)?.tag === "private" ? "private" : "public";
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
          visibility: encodeVisibility(module.visibility),
          parts: module.parts.map((part) => {
            if (part.contentHash === null) {
              throw new Error(
                `the part '${part.name}' has no content hash (use partContentItem)`,
              );
            }
            return { name: part.name, content_hash: part.contentHash };
          }),
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

/** 中身をまだ読んでいないパーツ */
function unresolvedPart(name: string, contentHash: string): CommitPart {
  return {
    name,
    contentHash,
    description: [],
    partType: null,
    expression: null,
    unresolved: true,
  };
}

function decodeParts(value: unknown): ReadonlyArray<CommitPart> {
  return (Array.isArray(value) ? value : []).map((part) =>
    unresolvedPart(
      String(field(part, "name")),
      String(field(part, "content_hash")),
    ),
  );
}

/** パーツの中身を definy の値 (`core.part-content`) にする */
export function encodePartContent(content: PartContent): unknown {
  return {
    description: encodeLocalizedText(content.description),
    visibility: encodeVisibility(content.visibility),
    part_type: optionOf(content.partType),
    expression: optionOf(content.expression),
  };
}

/** 値が `core.part-content` の形か */
export function isPartContent(value: unknown): boolean {
  return conformsToTypeDeclaration(
    value,
    resolveTypePart("core.part-content"),
    resolveTypePart,
    false,
  );
}

/** definy の値 (`core.part-content`) をパーツの中身にする. 形が違えば `undefined` */
export function decodePartContent(value: unknown): PartContent | undefined {
  return isPartContent(value) ? partContentFromValue(value) : undefined;
}

/** `core.part-content` の形だと確かめた値 (サーバーは definy 製の `core.value-conforms` で確かめる) をパーツの中身にする */
export function partContentFromValue(value: unknown): PartContent {
  return {
    description: decodeLocalizedText(field(value, "description")),
    visibility: decodeVisibility(field(value, "visibility")),
    partType: optionOrNull(field(value, "part_type")),
    expression: optionOrNull(field(value, "expression")),
  };
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
            visibility: decodeVisibility(field(module, "visibility")),
            parts: decodeParts(field(module, "parts")),
          })),
        },
      };
    }
  }
  return undefined;
}
