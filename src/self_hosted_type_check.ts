/**
 * definy 製の型チェッカー (`core.type-check-against`) でパーツの式を型検査する.
 * 旧 Rust 版 `definy_core::self_hosted_type_check` の移植.
 *
 * 型チェッカー本体は stage1 で 1 度だけ Wasm にコンパイルし (`compileTypeChecker`), パーツごとに
 * 検査する式・型環境・期待する型を線形メモリに書き込んで呼ぶ (`checkParts`).
 * サーバーの `SubmitEvent` の検査と UI の型エラー表示が同じ関数を使う
 * (docs/self-hosting.md の「definy 製型チェッカーの実行 (TypeScript 版)」).
 */
import {
  instantiateCompiledFunction,
  type CompiledFunctionInstance,
  collectReferencedParts,
  definyAstToSelfHostedAst,
  partReferenceId,
  SelfHostedAstConversionError,
  type DefinyValue,
  type Stage1CompilerInstance,
} from "./stage1_compiler.ts";
import {
  bytesToUrlSafeBase64NoPad,
  encodeCborItem,
  sha256BytesSync,
} from "./cbor.ts";
import { expressionToPartType } from "./tree_layout/part_type.ts";
import { list, record, string, variant } from "./self_hosted_ast.ts";

/** 型チェッカーが使う `core` のパーツの ID (URL-safe Base64) */
export type SelfHostedCoreParts = {
  readonly typeCheckAgainst: string;
};

/** 型環境に入れるパーツ (パーツ参照の型を解決するために使う) */
export type PartTypeEntry = {
  readonly partId: string;
  /** パーツの宣言型 (seeds/schemas の `PartType` の形) */
  readonly partType: unknown;
  /**
   * 型パーツ (`partType` が `"type"`) の宣言式. `core.type-resolve` が
   * `reference` 型を中身の型に展開するために使う
   */
  readonly typeDeclaration?: unknown;
};

/** 型パーツの定義を型環境に入れるときのキーの接尾辞. `core.type-resolve` と揃える */
export const TYPE_DEFINITION_KEY_SUFFIX = "#definition";

/** 検査するパーツ */
export type PartToCheck = {
  readonly expression: unknown;
  readonly partType: unknown;
};

export type SelfHostedTypeCheckOutcome =
  | { readonly kind: "ok" }
  /** 型チェッカーが返した `core.type-error`. `tag` はバリアント名 (`type_mismatch` など) */
  | {
      readonly kind: "type_error";
      readonly tag: string;
      readonly detail: DefinyValue;
    }
  /** 式を `core.expression` で表せない (未入力, コンパイラ組み込みなど) */
  | { readonly kind: "unsupported"; readonly message: string }
  /** 型チェッカーの実行に失敗した (Wasm の実行時エラーなど) */
  | { readonly kind: "checker_failed"; readonly message: string };

function asRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayOf(
  value: unknown,
): ReadonlyArray<Readonly<Record<string, unknown>>> {
  if (!Array.isArray(value)) {
    throw new SelfHostedAstConversionError(
      `expected a list: ${JSON.stringify(value)}`,
    );
  }
  return value.map((item) => asRecord(item) ?? {});
}

function optionalType(
  payload: unknown,
  convert: (value: unknown) => unknown,
): unknown {
  return payload == null ? variant("none") : variant("some", convert(payload));
}

/**
 * パーツの宣言型 (`PartType`) を, それを表す `core.type-ast` の値を作る式にする.
 * 表せない型 (型指定なしなど) は `SelfHostedAstConversionError` を投げる
 */
export function partTypeToSelfHostedAst(partType: unknown): unknown {
  if (
    partType === "number" ||
    partType === "string" ||
    partType === "boolean" ||
    partType === "type"
  ) {
    return variant(partType);
  }
  const obj = asRecord(partType);
  if (obj === null) {
    throw new SelfHostedAstConversionError(
      `core.type-ast cannot represent part type ${JSON.stringify(partType)}`,
    );
  }
  const convert = partTypeToSelfHostedAst;
  if ("list" in obj) {
    return variant("list", record([["item_type", convert(obj.list)]]));
  }
  if ("function" in obj) {
    const fn = asRecord(obj.function) ?? {};
    return variant(
      "function",
      record([
        [
          "parameters",
          list(
            arrayOf(fn.parameters).map((parameter) =>
              record([
                ["name", string(String(parameter.name ?? ""))],
                ["type", convert(parameter.type)],
              ]),
            ),
          ),
        ],
        ["return_type", convert(fn.return_type)],
      ]),
    );
  }
  if ("record" in obj) {
    return variant(
      "record",
      list(
        arrayOf(obj.record).map((field) =>
          record([
            ["key", string(String(field.key ?? ""))],
            ["field_type", convert(field.value)],
          ]),
        ),
      ),
    );
  }
  if ("union" in obj) {
    return variant(
      "union",
      list(
        arrayOf(obj.union).map((item) =>
          record([
            ["tag", string(String(item.tag ?? ""))],
            ["payload_type", optionalType(item.payload, convert)],
          ]),
        ),
      ),
    );
  }
  if ("type_part" in obj) {
    return variant(
      "reference",
      record([["part_hash", string(partReferenceId(obj.type_part))]]),
    );
  }
  throw new SelfHostedAstConversionError(
    `core.type-ast cannot represent part type ${JSON.stringify(partType)}`,
  );
}

/**
 * 型パーツの宣言式 (`TypeUnion` など) を, 型チェッカーが検査する `core.expression` の値を作る式にする
 */
export function typeDeclarationToSelfHostedAst(expression: unknown): unknown {
  const convert = typeDeclarationToSelfHostedAst;
  if (expression === "TypeNumber") {
    return variant("type_number");
  }
  if (expression === "TypeString") {
    return variant("type_string");
  }
  if (expression === "TypeBoolean") {
    return variant("type_boolean");
  }
  const obj = asRecord(expression);
  const typeList = asRecord(obj?.TypeList);
  if (typeList !== null) {
    return variant(
      "type_list",
      record([["item_type", convert(typeList.item_type)]]),
    );
  }
  const typeFunction = asRecord(obj?.TypeFunction);
  if (typeFunction !== null) {
    return variant(
      "type_function",
      record([
        [
          "parameters",
          list(
            arrayOf(typeFunction.parameters).map((parameter) =>
              record([
                ["name", string(String(parameter.name ?? ""))],
                ["type", convert(parameter.type)],
              ]),
            ),
          ),
        ],
        ["return_type", convert(typeFunction.return_type)],
      ]),
    );
  }
  const typeLiteral = asRecord(obj?.TypeLiteral);
  if (typeLiteral !== null) {
    return variant(
      "type_record",
      list(
        arrayOf(typeLiteral.items).map((field) =>
          record([
            ["key", string(String(field.key ?? ""))],
            ["value", convert(field.value)],
          ]),
        ),
      ),
    );
  }
  const typeUnion = asRecord(obj?.TypeUnion);
  if (typeUnion !== null) {
    return variant(
      "type_union",
      list(
        arrayOf(typeUnion.variants).map((item) =>
          record([
            ["tag", string(String(item.tag ?? ""))],
            ["payload_type", optionalType(item.payload_type, convert)],
          ]),
        ),
      ),
    );
  }
  const partReference = asRecord(obj?.PartReference);
  if (partReference !== null) {
    return variant(
      "part_reference",
      record([
        [
          "part_definition_event_hash",
          string(partReferenceId(partReference.part_definition_event_hash)),
        ],
      ]),
    );
  }
  throw new SelfHostedAstConversionError(
    "part_type 'type' requires a type declaration expression",
  );
}

/** `core.type-check-against` に渡す `expr` と `expected_type` の値を作る式 */
function partCheckArguments(part: PartToCheck): {
  readonly expression: unknown;
  readonly expectedType: unknown;
} {
  return {
    expression:
      part.partType === "type"
        ? typeDeclarationToSelfHostedAst(part.expression)
        : definyAstToSelfHostedAst(part.expression),
    expectedType: partTypeToSelfHostedAst(part.partType),
  };
}

/**
 * `core.type-env` の値 `{ variables: [], parts: [{ part_definition_event_hash, part_type }] }` を作る式.
 * 型パーツは, 宣言した型を `{id}#definition` のキーでも入れる.
 * `core.type-ast` で表せない型のパーツは環境に入れない (参照すると `part_not_found` になる)
 */
function typeEnvExpression(env: ReadonlyArray<PartTypeEntry>): unknown {
  const entryRecord = (key: string, partType: unknown): unknown => {
    try {
      return record([
        ["part_definition_event_hash", string(key)],
        ["part_type", partTypeToSelfHostedAst(partType)],
      ]);
    } catch (e) {
      if (e instanceof SelfHostedAstConversionError) {
        return null;
      }
      throw e;
    }
  };
  const parts = env.flatMap((entry) => {
    const declared =
      entry.typeDeclaration == null
        ? null
        : expressionToPartType(entry.typeDeclaration);
    return [
      entryRecord(entry.partId, entry.partType),
      declared == null
        ? null
        : entryRecord(`${entry.partId}${TYPE_DEFINITION_KEY_SUFFIX}`, declared),
    ].filter((item) => item !== null);
  });
  return record([
    ["variables", list([])],
    ["parts", list(parts)],
  ]);
}

function typeResultToOutcome(result: DefinyValue): SelfHostedTypeCheckOutcome {
  const value = asRecord(result) as {
    readonly tag?: unknown;
    readonly payload?: DefinyValue;
  } | null;
  if (value?.tag === "ok") {
    return { kind: "ok" };
  }
  const error = asRecord(value?.payload) as {
    readonly tag?: unknown;
    readonly payload?: DefinyValue;
  } | null;
  if (value?.tag === "error" && typeof error?.tag === "string") {
    return {
      kind: "type_error",
      tag: error.tag,
      detail: error.payload ?? null,
    };
  }
  throw new Error(
    `unexpected core.type-result value: ${JSON.stringify(result)}`,
  );
}

/**
 * 1 つのインスタンスで検査するパーツの数. 線形メモリは解放されないので, 増えすぎる前に作り直す
 */
const CALLS_PER_INSTANCE = 32;

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * `core.type-check-against` を stage1 で Wasm にコンパイルする. 結果は関数を返す式の Wasm で,
 * `new WebAssembly.Module` にして `checkParts` に渡す.
 * `resolvePart` はパーツ ID (URL-safe Base64) から式を返す (型チェッカーが参照するパーツを集めるのに使う)
 */
export function compileTypeChecker(options: {
  readonly compiler: Stage1CompilerInstance;
  readonly core: SelfHostedCoreParts;
  readonly resolvePart: (id: string) => unknown;
}): Uint8Array {
  const expression = {
    PartReference: {
      part_definition_event_hash: options.core.typeCheckAgainst,
    },
  };
  const { parts, unresolved } = collectReferencedParts(
    expression,
    options.resolvePart,
  );
  if (unresolved.length > 0) {
    throw new Error(
      `the type checker references parts that cannot be compiled: ${unresolved.join(", ")}`,
    );
  }
  return options.compiler.compile(expression, parts);
}

/**
 * 型環境を決めて, パーツを 1 つずつ検査できるようにする. 型チェッカーのインスタンスと線形メモリに書いた型環境を
 * 呼び出しの間で使い回すので, 裏で少しずつ検査するときにも使う
 */
export function createTypeCheckSession(options: {
  readonly typeChecker: WebAssembly.Module;
  readonly env: ReadonlyArray<PartTypeEntry>;
}): { readonly check: (part: PartToCheck) => SelfHostedTypeCheckOutcome } {
  const env = typeEnvExpression(options.env);
  // 型環境は大きいので, インスタンスごとに 1 度だけ線形メモリに書き込んで使い回す.
  // 型チェッカーが trap したら (スタック不足など) メモリの状態が分からないので作り直す
  let current:
    | {
        readonly instance: CompiledFunctionInstance;
        readonly envPtr: number;
        calls: number;
      }
    | undefined;
  return {
    check: (part) => {
      let args: ReturnType<typeof partCheckArguments>;
      try {
        args = partCheckArguments(part);
      } catch (e) {
        if (e instanceof SelfHostedAstConversionError) {
          return { kind: "unsupported", message: e.message };
        }
        throw e;
      }
      try {
        if (current === undefined || current.calls >= CALLS_PER_INSTANCE) {
          const instance = instantiateCompiledFunction(options.typeChecker);
          current = { instance, envPtr: instance.writeArgument(env), calls: 0 };
        }
        const { instance, envPtr } = current;
        current.calls += 1;
        return typeResultToOutcome(
          instance.read(
            instance.call([
              instance.writeArgument(args.expression),
              envPtr,
              instance.writeArgument(args.expectedType),
            ]),
          ),
        );
      } catch (e) {
        current = undefined;
        return { kind: "checker_failed", message: errorMessage(e) };
      }
    },
  };
}

/**
 * `parts` の各パーツを, `compileTypeChecker` でコンパイルした型チェッカーで検査する.
 * 結果は `parts` と同じ順に並ぶ
 */
export function checkParts(options: {
  readonly typeChecker: WebAssembly.Module;
  readonly parts: ReadonlyArray<PartToCheck>;
  readonly env: ReadonlyArray<PartTypeEntry>;
}): ReadonlyArray<SelfHostedTypeCheckOutcome> {
  const session = createTypeCheckSession(options);
  return options.parts.map((part) => session.check(part));
}

function isTaggedValue(
  value: DefinyValue,
): value is { readonly tag: string; readonly payload: DefinyValue | null } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { readonly tag?: unknown }).tag === "string" &&
    "payload" in value
  );
}

function fieldOf(value: DefinyValue | null, key: string): DefinyValue | null {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !isTaggedValue(value)
    ? ((value as { readonly [key: string]: DefinyValue })[key] ?? null)
    : null;
}

/**
 * `core.type-ast` の値を `List<number>` のような文字列にする. 型でなければ `null`.
 * `reference` 型は `resolveName` でパーツ名にする (分からなければ ID の先頭)
 */
export function formatTypeAst(
  value: DefinyValue | null,
  resolveName: (partId: string) => string | undefined = () => undefined,
): string | null {
  if (value === null || !isTaggedValue(value)) {
    return null;
  }
  const format = (v: DefinyValue | null): string =>
    formatTypeAst(v, resolveName) ?? JSON.stringify(v);
  const items = (v: DefinyValue | null): ReadonlyArray<DefinyValue> =>
    Array.isArray(v) ? v : [];
  switch (value.tag) {
    case "number":
    case "string":
    case "boolean":
    case "type":
      return value.tag;
    case "list":
      return `List<${format(fieldOf(value.payload, "item_type"))}>`;
    case "function":
      return `(${items(fieldOf(value.payload, "parameters"))
        .map(
          (parameter) =>
            `${String(fieldOf(parameter, "name"))}: ${format(fieldOf(parameter, "type"))}`,
        )
        .join(", ")}) -> ${format(fieldOf(value.payload, "return_type"))}`;
    case "record":
      return `{ ${items(value.payload)
        .map(
          (field) =>
            `${String(fieldOf(field, "key"))}: ${format(fieldOf(field, "field_type"))}`,
        )
        .join(", ")} }`;
    case "union":
      return items(value.payload)
        .map((variant) => {
          const payloadType = fieldOf(variant, "payload_type");
          const tag = String(fieldOf(variant, "tag"));
          return isTaggedValue(payloadType) && payloadType.tag === "some"
            ? `${tag}(${format(payloadType.payload)})`
            : tag;
        })
        .join(" | ");
    case "reference": {
      const partId = String(fieldOf(value.payload, "part_hash"));
      return resolveName(partId) ?? partId.slice(0, 8);
    }
    default:
      return null;
  }
}

/** `core.type-error` のペイロードを読める形にする (型は `formatTypeAst`, それ以外は JSON) */
function formatTypeErrorDetail(
  detail: DefinyValue,
  resolveName: (partId: string) => string | undefined,
): string {
  if (detail === null) {
    return "";
  }
  const asType = formatTypeAst(detail, resolveName);
  if (asType !== null) {
    return asType;
  }
  if (typeof detail === "object" && !Array.isArray(detail)) {
    return Object.entries(detail as { readonly [key: string]: DefinyValue })
      .map(
        ([key, value]) =>
          `${key}: ${formatTypeAst(value, resolveName) ?? JSON.stringify(value)}`,
      )
      .join(", ");
  }
  return JSON.stringify(detail);
}

/**
 * `checkParts` の結果を, コミットを拒否する理由の 1 行にする. 問題なければ `null`.
 * `resolveName` は型の中のパーツ参照をパーツ名にするのに使う
 */
export function outcomeErrorMessage(
  name: string,
  outcome: SelfHostedTypeCheckOutcome,
  resolveName: (partId: string) => string | undefined = () => undefined,
): string | null {
  switch (outcome.kind) {
    case "ok":
      return null;
    case "type_error": {
      const detail = formatTypeErrorDetail(outcome.detail, resolveName);
      return `part '${name}': type error: ${outcome.tag}${detail === "" ? "" : ` (${detail})`}`;
    }
    case "unsupported":
      return `part '${name}': not supported: ${outcome.message}`;
    case "checker_failed":
      return `part '${name}': type checker failed: ${outcome.message.split("\n")[0] ?? ""}`;
  }
}

/** あるパーツの最新の定義 */
export type LatestPart = {
  readonly partId: string;
  /** パーツが属するモジュールの ID (URL-safe Base64) */
  readonly moduleId: string;
  readonly name: string;
  /** 宣言型. 無ければ `null` */
  readonly partType: unknown;
  /** 式. 無い (CAS に預けたまま読んでいないものを含む) ときは `null` */
  readonly expression: unknown;
  /**
   * 式が変わっていないかを比べるキー. 同じキーなら式も同じ (違うキーでも式が同じことはある).
   * サーバーは式の CBOR の SHA-256 (= CAS の content hash), ブラウザは定義したイベントとパーツ名.
   * `null` は比べられない (変わったものとして扱う)
   */
  readonly expressionKey: string | null;
};

/** 最新のパーツを型環境にする (型の無いパーツは入れない. 型パーツは宣言式も入れる) */
export function typeEnvFromParts(
  parts: Iterable<LatestPart>,
): ReadonlyArray<PartTypeEntry> {
  return [...parts]
    .filter((part) => part.partType != null)
    .map((part) => ({
      partId: part.partId,
      partType: part.partType,
      typeDeclaration: part.partType === "type" ? part.expression : undefined,
    }));
}

/** 型環境が変わったかを比べるキー (全パーツの ID と型, 型パーツの宣言式から決まる) */
export function typeEnvKey(parts: Iterable<LatestPart>): string {
  return expressionContentHash(
    [...parts]
      .map(
        (part) =>
          `${part.partId}:${partTypeKey(part.partType)}:${
            part.partType === "type" ? (part.expressionKey ?? "") : ""
          }`,
      )
      .sort(),
  );
}

/** 式の CBOR の SHA-256 (URL-safe Base64). CAS の content hash と同じ */
export function expressionContentHash(expression: unknown): string {
  return bytesToUrlSafeBase64NoPad(sha256BytesSync(encodeCborItem(expression)));
}

function partTypeKey(partType: unknown): string {
  return partType == null ? "" : expressionContentHash(partType);
}

/**
 * モジュールのコミットを型チェッカーで検査し, 検査したパーツの名前と結果を返す.
 * サーバーがコミットを受け付けるかの判定と, UI の変更ページのコミット前の検査が同じ関数を使う.
 *
 * - 型環境は `latestParts` (全モジュールの最新のコミットのパーツ) に, このコミットのパーツを重ねたもの
 * - パーツの型が 1 つも変わっていなければ, 式が変わったパーツ (と新しいパーツ) だけを検査する.
 *   型が変わったら, それを参照するパーツに影響するのでモジュールの全パーツを検査する
 * - `allowBuiltinParts` が真なら, 式の無いパーツや `core.expression` で表せないパーツ
 *   (コンパイラ組み込み) を検査せずに受け入れる (結果に含めない). システムアカウントのビルトインモジュール用
 * - 式を CAS に預けているパーツは, 呼び出し側で `expression` を埋めておく
 *   (コミットのパーツと, 型環境の型パーツ)
 */
export function checkModuleCommitParts(options: {
  readonly typeChecker: WebAssembly.Module;
  readonly moduleId: string;
  readonly committed: ReadonlyArray<LatestPart>;
  readonly latestParts: ReadonlyMap<string, LatestPart>;
  readonly allowBuiltinParts: boolean;
}): ReadonlyArray<{
  readonly name: string;
  readonly outcome: SelfHostedTypeCheckOutcome;
}> {
  const previous = new Map(
    [...options.latestParts].filter(
      ([, part]) => part.moduleId === options.moduleId,
    ),
  );
  const parts = new Map(
    [...options.latestParts].filter(
      ([, part]) => part.moduleId !== options.moduleId,
    ),
  );
  for (const part of options.committed) {
    parts.set(part.partId, part);
  }

  const typesChanged =
    previous.size !== options.committed.length ||
    options.committed.some((part) => {
      const before = previous.get(part.partId);
      return (
        before === undefined ||
        partTypeKey(before.partType) !== partTypeKey(part.partType)
      );
    });
  const results: Array<{
    readonly name: string;
    readonly outcome: SelfHostedTypeCheckOutcome;
  }> = [];
  const toCheck: Array<LatestPart> = [];
  for (const part of options.committed) {
    const before = previous.get(part.partId);
    const unchanged =
      before !== undefined &&
      part.expressionKey !== null &&
      before.expressionKey === part.expressionKey;
    if (!typesChanged && unchanged) {
      continue;
    }
    if (part.expression != null && part.partType != null) {
      toCheck.push(part);
    } else if (!options.allowBuiltinParts) {
      results.push({
        name: part.name,
        outcome: {
          kind: "unsupported",
          message: "part has no expression or type",
        },
      });
    }
  }
  if (toCheck.length === 0) {
    return results;
  }

  const outcomes = checkParts({
    typeChecker: options.typeChecker,
    parts: toCheck,
    env: typeEnvFromParts(parts.values()),
  });
  toCheck.forEach((part, i) => {
    const outcome = outcomes[i];
    if (
      outcome === undefined ||
      (options.allowBuiltinParts && outcome.kind === "unsupported")
    ) {
      return;
    }
    results.push({ name: part.name, outcome });
  });
  return results;
}
