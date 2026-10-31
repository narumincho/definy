/**
 * 署名を確かめた後のイベントを受け付けるかを決める definy 製の `core.check-event` まわり (docs/event.md「受け付ける規則」).
 *
 * サーバーは `definy.submit-event` (`wasm/service.wasm`) の中で `core.check-event` を呼び, 理由のメッセージも
 * definy (`definy.event-rejection-message`) が作る (docs/service.md). ここの {@link checkEvent} は
 * `core.check-event` だけをコンパイルした `wasm/event_checker.wasm` で規則を試すためのもの (テスト).
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
 * 規則が見ない説明・メッセージ・パーツの中身の content hash を除いたイベントの中身 (Wasm に書き込む量を減らす)
 */
export function contentForCheck(content: EventContent): EventContent {
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
    instance.call({
      content: instance.writeArgument(
        encodeEventContent(contentForCheck(content)),
      ),
      facts: instance.writeArgument({
        account_id: facts.accountId,
        account_created: facts.accountCreated,
        commits: facts.commits.map(commitSummaryLiteral),
      }),
    }),
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
    instance.call({
      value: instance.writeArgument(toCoreValue(value)),
      declaration: instance.writeArgument(
        variant("part_reference", { part_definition_event_hash: typeName }),
      ),
      // 型の宣言の一覧は同じオブジェクトなので, 並べた結果を使い回せる (writeArgument)
      declarations: instance.writeArgument(TYPE_DECLARATIONS),
    }),
  );
  if (typeof result !== "boolean") {
    throw new Error("core.value-conforms returned a non-boolean value");
  }
  return result;
}
