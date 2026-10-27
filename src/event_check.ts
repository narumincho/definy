/**
 * 署名を確かめた後のイベントを受け付けるかを, definy 製の `core.check-event` で決める (docs/event.md「受け付ける規則」).
 *
 * `core.check-event` は `npm run build:seeds` が stage1 でコンパイルした `wasm/event_checker.wasm` を使う
 * (Cloudflare Workers は実行時に Wasm をコンパイルできない). TypeScript 側は, 保存している事実
 * (アカウントを作ったか, 受け付けたプロジェクトのコミット) を渡し, 返った理由をメッセージにするだけ.
 * 規則が使う状態 (ブランチの最新のコミットと作成者など. docs/branch.md) は definy が求める.
 *
 * イベントの中身の形も, definy 製の `core.value-conforms` (`wasm/shape_checker.wasm`) で確かめられる ({@link conformsInDefiny})
 */
import eventTypeDeclarations from "../seeds/schemas/event-types.json" with { type: "json" };
import { variant, variantOf } from "./definy_value.ts";
import { encodeEventContent, type EventContent } from "./event_content.ts";
import {
  collectReferencedParts,
  instantiateCompiledFunction,
  type Stage1CompilerInstance,
} from "./stage1_compiler.ts";

/** サーバーが受け付けたプロジェクトのコミット (`core.commit-summary`) */
export type CommitSummary = {
  readonly eventHash: string;
  readonly accountId: string;
  readonly projectName: string;
  readonly branch: string;
  readonly timeMs: number;
  readonly moduleNames: ReadonlyArray<string>;
};

/**
 * サーバーが `core.check-event` に渡す事実 (`core.event-check-facts`. docs/event.md).
 * 規則が使う状態 (ブランチの最新のコミット, 作成者など) は definy の `core.event-check-state-of` が求める
 */
export type EventCheckFacts = {
  /** イベントのアカウント */
  readonly accountId: string;
  /** このアカウントの `create_account` を受け付けたか */
  readonly accountCreated: boolean;
  /** 受け付けたプロジェクトのコミット (ストアの順). プロジェクトのコミットのイベントでなければ空でよい */
  readonly commits: ReadonlyArray<CommitSummary>;
};

/** `core.event-rejection` の値. `tag` はバリアント名 (`parent_commit_mismatch` など) */
export type EventRejection = {
  readonly tag: string;
  readonly payload: unknown;
};

/**
 * seed の関数のパーツ (`core.check-event`, `core.value-conforms`) を stage1 で Wasm にコンパイルする.
 * `resolvePart` はパーツ ID (URL-safe Base64) から式を返す
 */
export function compileSeedFunction(options: {
  readonly compiler: Stage1CompilerInstance;
  readonly partId: string;
  readonly resolvePart: (id: string) => unknown;
}): Uint8Array {
  const expression = variant("part_reference", {
    part_definition_event_hash: options.partId,
  });
  const { parts, unresolved } = collectReferencedParts(
    expression,
    options.resolvePart,
  );
  if (unresolved.length > 0) {
    throw new Error(
      `the part references parts that cannot be compiled: ${unresolved.join(", ")}`,
    );
  }
  return options.compiler.compile(expression, parts);
}

/**
 * 規則が見ない説明・メッセージ・パーツの中身の content hash を除いたイベントの中身 (線形メモリに書く量を減らす)
 */
function contentForCheck(content: EventContent): EventContent {
  if (content.type !== "project_commit") {
    return content;
  }
  return {
    type: "project_commit",
    commit: {
      ...content.commit,
      projectDescription: [],
      message: "",
      modules: content.commit.modules.map((module) => ({
        name: module.name,
        description: [],
        parts: module.parts.map((part) => ({
          name: part.name,
          description: [],
          partType: null,
          expression: null,
          contentHash: "",
        })),
      })),
    },
  };
}

/** 受け付けたコミットを definy の値 (`core.commit-summary`) にする */
export function commitSummaryLiteral(commit: CommitSummary): unknown {
  return {
    event_hash: commit.eventHash,
    account_id: commit.accountId,
    project_name: commit.projectName,
    branch: commit.branch,
    time: commit.timeMs,
    module_names: commit.moduleNames,
  };
}

/** `core.check-event` (コンパイルした `checker`) でイベントを検査し, 受け付けない理由を返す. 空なら受け付ける */
export function checkEvent(
  checker: WebAssembly.Module,
  content: EventContent,
  facts: EventCheckFacts,
): ReadonlyArray<EventRejection> {
  const instance = instantiateCompiledFunction(checker);
  const result = instance.read(
    instance.call([
      instance.writeArgument(encodeEventContent(contentForCheck(content))),
      instance.writeArgument({
        account_id: facts.accountId,
        account_created: facts.accountCreated,
        commits: facts.commits.map(commitSummaryLiteral),
      }),
    ]),
  );
  if (!Array.isArray(result)) {
    throw new Error("core.check-event returned a non-list value");
  }
  return result.map((item) => {
    const tagged = variantOf(item);
    if (tagged === undefined) {
      throw new Error("core.check-event returned a non-variant rejection");
    }
    return { tag: tagged.tag, payload: tagged.payload };
  });
}

/** 受け付けない理由のメッセージ (英語. Connect-RPC のエラーメッセージにする) */
export function eventRejectionMessage(rejection: EventRejection): string {
  switch (rejection.tag) {
    case "account_already_created":
      return "the account has already been created";
    case "account_not_created":
      return "the account has not been created (submit create_account first)";
    case "empty_account_name":
      return "the account name is empty";
    case "empty_project_name":
      return "the project name is empty";
    case "empty_branch_name":
      return "the branch name is empty";
    case "first_branch_must_be_main":
      return "the first commit of a project must be on the main branch";
    case "not_branch_creator":
      return "only the account that created the branch can commit to it (create a new branch instead)";
    case "merged_commit_not_in_project":
      return "merged_commit_hash must be a commit of the same project";
    case "parent_commit_mismatch":
      return "parent_commit_hash must be the latest commit of the branch, or a commit of the project for a new branch (fetch the latest events and commit again)";
    case "empty_module_name":
      return "a module name is empty";
    case "duplicate_module_name":
      return `the module name '${String(rejection.payload)}' is duplicated`;
    case "module_in_other_project":
      return `the module '${String(rejection.payload)}' belongs to another project`;
    case "empty_part_name":
      return "a part name is empty";
    case "duplicate_part_name":
      return `the part name '${String(rejection.payload)}' is duplicated`;
  }
  return `rejected: ${rejection.tag}`;
}

/** CBOR から読んだ値を `core.value` の値にする (`core.value-conforms` に渡す) */
export function toCoreValue(value: unknown): unknown {
  if (typeof value === "string") {
    return variant("string", value);
  }
  if (typeof value === "boolean") {
    return variant("boolean", value);
  }
  if (typeof value === "number") {
    // definy の数は整数だけ
    return Number.isSafeInteger(value)
      ? variant("number", value)
      : variant("unit");
  }
  if (Array.isArray(value)) {
    return variant("list", value.map(toCoreValue));
  }
  const tagged = variantOf(value);
  if (tagged !== undefined) {
    return variant("variant", {
      tag: tagged.tag,
      payload:
        tagged.payload === null ? variant("unit") : toCoreValue(tagged.payload),
    });
  }
  if (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Uint8Array)
  ) {
    return variant(
      "record",
      Object.entries(value).map(([key, item]) => ({
        key,
        value: toCoreValue(item),
      })),
    );
  }
  return variant("unit");
}

/** 宣言の中の `{"$part": 名前}` (seed の参照) を名前の文字列にする. `core.value-conforms` は型パーツを名前で引く */
function withPartNames(declaration: unknown): unknown {
  if (Array.isArray(declaration)) {
    return declaration.map(withPartNames);
  }
  if (typeof declaration === "object" && declaration !== null) {
    const name = (declaration as { readonly $part?: unknown }).$part;
    if (typeof name === "string") {
      return name;
    }
    return Object.fromEntries(
      Object.entries(declaration).map(([key, item]) => [
        key,
        withPartNames(item),
      ]),
    );
  }
  return declaration;
}

/** `core.value-conforms` に渡す型パーツの宣言 (`core.type-declaration-entry`. seeds/schemas/event-types.json から) */
const TYPE_DECLARATIONS: ReadonlyArray<unknown> = Object.entries(
  eventTypeDeclarations as Readonly<Record<string, unknown>>,
).map(([id, declaration]) => ({
  id,
  declaration: withPartNames(declaration),
}));

/**
 * CBOR から読んだ値 `value` が型パーツ `typeName` (`core.event-content` など. seeds/schemas/event-types.json にあるもの)
 * の形かを, definy 製の `core.value-conforms` (コンパイルした `shapeChecker`) で確かめる
 */
export function conformsInDefiny(
  shapeChecker: WebAssembly.Module,
  value: unknown,
  typeName: string,
): boolean {
  const instance = instantiateCompiledFunction(shapeChecker);
  const result = instance.read(
    instance.call([
      instance.writeArgument(toCoreValue(value)),
      instance.writeArgument(
        variant("part_reference", { part_definition_event_hash: typeName }),
      ),
      // 型の宣言の一覧は同じオブジェクトなので, 並べた結果を使い回せる (writeArgument)
      instance.writeArgument(TYPE_DECLARATIONS),
    ]),
  );
  if (typeof result !== "boolean") {
    throw new Error("core.value-conforms returned a non-boolean value");
  }
  return result;
}
