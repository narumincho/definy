/**
 * definy 製の型チェッカー (`core.type-check-against`) でパーツの式を型検査する.
 * 旧 Rust 版 `definy_core::self_hosted_type_check` の移植.
 *
 * 型チェッカー本体は stage1 で 1 度だけ Wasm にコンパイルし (`compileTypeChecker`), 全モジュールの最新のパーツと
 * コミットするパーツを書き込んで definy 製の `core.type-checker` で型環境と検査するパーツを決めてから,
 * パーツごとに検査する式と期待する型を書き込んで呼ぶ (`createTypeCheckSession`).
 * サーバーの `SubmitEvent` の検査と UI の型エラー表示が同じ関数を使う
 * (docs/self-hosting.md の「definy 製型チェッカーの実行 (TypeScript 版)」).
 */
import {
  instantiateCompiledFunction,
  type CompiledFunctionInstance,
  collectReferencedParts,
  BUILTIN_PARAMETERS,
  compilerBuiltinName,
  definyAstToSelfHostedAst,
  definyAstWithHolesToSelfHostedAst,
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
import { list, record, string, variant } from "./self_hosted_ast.ts";

/** 型チェッカーが使う `core` のパーツの ID (URL-safe Base64) */
export type SelfHostedCoreParts = {
  /**
   * `core.type-checker`. 全モジュールの最新のパーツとコミットするパーツから型環境と検査するパーツを決め,
   * その環境のもとで `core.type-check-against` で検査する関数と一緒に返す
   */
  readonly typeChecker: string;
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
  /**
   * コンパイラ組み込みのパーツ (`core.plus` など) なら組み込みの名前 ({@link compilerBuiltinName}).
   * 型環境ではパーツの型を `core.type-ast` の `builtin` にし, 型チェッカーが呼び出しを名前で検査する
   */
  readonly builtin?: string | undefined;
};

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
      /**
       * エラーを見つけた一番内側の式 (`core.expression` の値). `located` で包まれていなければ `null`.
       * `findTypeErrorPath` (tree_layout) でエディタのパスにする
       */
      readonly expression: DefinyValue;
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
    partType === "type" ||
    partType === "secret"
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
  if ("code" in obj) {
    return variant("code", convert(obj.code));
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
  if (expression === "TypeSecret") {
    return variant("type_secret");
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
function partCheckArguments(
  part: PartToCheck,
  allowHoles: boolean,
): {
  readonly expression: unknown;
  readonly expectedType: unknown;
} {
  const builtin = compilerBuiltinName(part.expression);
  if (builtin !== undefined) {
    // 組み込みの式 (`builtin`) の型は宣言した関数の型でなく `builtin` なので, 宣言型と比べられない
    throw new SelfHostedAstConversionError(
      `compiler built-in part (${builtin}) cannot be type-checked`,
    );
  }
  return {
    expression:
      part.partType === "type"
        ? typeDeclarationToSelfHostedAst(part.expression)
        : allowHoles
          ? definyAstWithHolesToSelfHostedAst(part.expression)
          : definyAstToSelfHostedAst(part.expression),
    expectedType: partTypeToSelfHostedAst(part.partType),
  };
}

/** `core.type-checker` に渡すパーツ */
type ModuleEntry = {
  readonly partId: string;
  /** パーツが属するモジュールの ID. 型環境だけを作るときは空文字列 */
  readonly moduleId: string;
  /** 宣言型. 無ければ `null` */
  readonly partType: unknown;
  /** 型パーツの宣言式 */
  readonly typeDeclaration?: unknown;
  /** {@link LatestPart.expressionKey} */
  readonly expressionKey: string | null;
  readonly hasExpression: boolean;
  /** {@link PartTypeEntry.builtin} */
  readonly builtin?: string | undefined;
};

/**
 * 型環境だけを作るときにコミット先として渡すモジュール ID. URL-safe Base64 のモジュール ID には `#` が入らないので,
 * どのパーツのモジュールとも一致せず, 全パーツが型環境に入る
 */
const NO_MODULE = "#";

/**
 * `core.type-checker` に渡すパーツの一覧
 * `[{ part_id, module_id, part_type, type_declaration, expression_key, has_expression }]` を作る式.
 * `core.type-ast` で表せない型は `none` (型の無いパーツと同じく型環境に入らない) にする.
 * コンパイラ組み込みのパーツの型は `builtin` (名前) にする
 */
function moduleEntriesExpression(entries: ReadonlyArray<ModuleEntry>): unknown {
  return list(
    entries.map((entry) =>
      record([
        ["part_id", string(entry.partId)],
        ["module_id", string(entry.moduleId)],
        [
          "part_type",
          entry.builtin === undefined
            ? partTypeOption(entry.partType)
            : variant("some", variant("builtin", string(entry.builtin))),
        ],
        ["type_declaration", typeDeclarationOption(entry.typeDeclaration)],
        [
          "expression_key",
          entry.expressionKey === null
            ? variant("none")
            : variant("some", string(entry.expressionKey)),
        ],
        ["has_expression", { Boolean: { value: entry.hasExpression } }],
      ]),
    ),
  );
}

/** 宣言型を `core.type-ast` の値の `some` にする. 無いか表せなければ `none` */
function partTypeOption(partType: unknown): unknown {
  if (partType == null) {
    return variant("none");
  }
  try {
    return variant("some", partTypeToSelfHostedAst(partType));
  } catch (e) {
    if (e instanceof SelfHostedAstConversionError) {
      return variant("none");
    }
    throw e;
  }
}

function latestPartToModuleEntry(part: LatestPart): ModuleEntry {
  return {
    partId: part.partId,
    moduleId: part.moduleId,
    partType: part.partType,
    typeDeclaration: part.partType === "type" ? part.expression : undefined,
    expressionKey: part.expressionKey,
    hasExpression: part.expression != null,
    builtin: compilerBuiltinName(part.expression),
  };
}

/** 型パーツの宣言式を `core.expression` の値の `some` にする. 無いか表せなければ `none` */
function typeDeclarationOption(declaration: unknown): unknown {
  if (declaration == null) {
    return variant("none");
  }
  try {
    return variant("some", typeDeclarationToSelfHostedAst(declaration));
  } catch (e) {
    if (e instanceof SelfHostedAstConversionError) {
      return variant("none");
    }
    throw e;
  }
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
    return typeErrorToOutcome(error.tag, error.payload ?? null, null);
  }
  throw new Error(
    `unexpected core.type-result value: ${JSON.stringify(result)}`,
  );
}

/**
 * `core.type-error` を結果にする. `located` (`core.type-check` がエラーを見つけた式と組にしたもの) は外して
 * 式を `expression` に入れる
 */
function typeErrorToOutcome(
  tag: string,
  payload: DefinyValue,
  expression: DefinyValue,
): SelfHostedTypeCheckOutcome {
  if (tag === "located") {
    const located = asRecord(payload) as {
      readonly expression?: DefinyValue;
      readonly error?: {
        readonly tag?: unknown;
        readonly payload?: DefinyValue;
      };
    } | null;
    if (typeof located?.error?.tag === "string") {
      return typeErrorToOutcome(
        located.error.tag,
        located.error.payload ?? null,
        located.expression ?? null,
      );
    }
  }
  return { kind: "type_error", tag, detail: payload, expression };
}

/**
 * 1 つのインスタンスで検査するパーツの数. 線形メモリは解放されないので, 増えすぎる前に作り直す
 */
const CALLS_PER_INSTANCE = 32;

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * `core.type-checker` を stage1 で Wasm にコンパイルする. 結果は関数を返す式の Wasm で,
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
      part_definition_event_hash: options.core.typeChecker,
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

export type TypeCheckSession = {
  readonly check: (part: PartToCheck) => SelfHostedTypeCheckOutcome;
  /**
   * 式の中の `{"Hole": {"probe": true}}` の位置で期待する型 (`core.type-ast` の値) を型チェッカーに聞く.
   * 他の未入力はその位置の期待する型として受け入れる. 推論する位置 (`==` の左辺など) や,
   * それより先に別の型エラーが見つかったときは `null`
   */
  readonly findExpectedType: (part: PartToCheck) => DefinyValue | null;
};

/**
 * 型環境を決めて, パーツを 1 つずつ検査できるようにする. 型チェッカーのインスタンスと線形メモリに書いた型環境を
 * 呼び出しの間で使い回すので, 裏で少しずつ検査するときにも使う
 */
export function createTypeCheckSession(options: {
  readonly typeChecker: WebAssembly.Module;
  readonly env: ReadonlyArray<PartTypeEntry>;
}): TypeCheckSession {
  return createModuleCommitSession({
    typeChecker: options.typeChecker,
    latest: options.env.map((entry) => ({
      partId: entry.partId,
      moduleId: "",
      partType: entry.partType,
      typeDeclaration: entry.typeDeclaration,
      expressionKey: null,
      hasExpression: false,
      builtin: entry.builtin,
    })),
    committed: [],
    moduleId: NO_MODULE,
  });
}

/**
 * `core.type-checker` で, モジュール `moduleId` に `committed` をコミットしたときの型環境と検査するパーツを決め,
 * その環境でパーツを 1 つずつ検査できるようにする
 */
function createModuleCommitSession(options: {
  readonly typeChecker: WebAssembly.Module;
  readonly latest: ReadonlyArray<ModuleEntry>;
  readonly committed: ReadonlyArray<ModuleEntry>;
  readonly moduleId: string;
}): {
  /** 検査するパーツ (型が 1 つも変わらなければ, 式が変わったパーツと新しいパーツ) の ID */
  readonly toCheck: () => ReadonlyArray<string>;
  /** 式か型の無いパーツの ID */
  readonly withoutExpression: () => ReadonlyArray<string>;
} & TypeCheckSession {
  const latest = moduleEntriesExpression(options.latest);
  const committed = moduleEntriesExpression(options.committed);
  const moduleId = string(options.moduleId);
  // 型環境は大きいので, インスタンスごとに 1 度だけ線形メモリに書き込んで definy 側で型環境を作り,
  // その環境で検査する関数 (`core.type-checker` が返すレコードの `check`) を使い回す.
  // 型チェッカーが trap したら (スタック不足など) メモリの状態が分からないので作り直す
  let current:
    | {
        readonly instance: CompiledFunctionInstance;
        readonly planPtr: number;
        readonly checkerPtr: number;
        calls: number;
      }
    | undefined;
  const ensureInstance = (): NonNullable<typeof current> => {
    if (current === undefined || current.calls >= CALLS_PER_INSTANCE) {
      const instance = instantiateCompiledFunction(options.typeChecker);
      const planPtr = instance.call([
        instance.writeArgument(latest),
        instance.writeArgument(committed),
        instance.writeArgument(moduleId),
      ]);
      current = {
        instance,
        planPtr,
        checkerPtr: instance.recordField(planPtr, "check"),
        calls: 0,
      };
    }
    return current;
  };
  const readIds = (key: string): ReadonlyArray<string> => {
    const { instance, planPtr } = ensureInstance();
    const ids = instance.read(instance.recordField(planPtr, key));
    if (!Array.isArray(ids)) {
      throw new Error(`core.type-checker returned a non-list ${key}`);
    }
    return ids.map(String);
  };
  const run = (
    part: PartToCheck,
    allowHoles: boolean,
  ): SelfHostedTypeCheckOutcome => {
    let args: ReturnType<typeof partCheckArguments>;
    try {
      args = partCheckArguments(part, allowHoles);
    } catch (e) {
      if (e instanceof SelfHostedAstConversionError) {
        return { kind: "unsupported", message: e.message };
      }
      throw e;
    }
    try {
      const { instance, checkerPtr } = ensureInstance();
      if (current !== undefined) {
        current.calls += 1;
      }
      return typeResultToOutcome(
        instance.read(
          instance.callClosure(checkerPtr, [
            instance.writeArgument(args.expression),
            instance.writeArgument(args.expectedType),
          ]),
        ),
      );
    } catch (e) {
      current = undefined;
      return { kind: "checker_failed", message: errorMessage(e) };
    }
  };
  return {
    toCheck: () => readIds("to_check"),
    withoutExpression: () => readIds("without_expression"),
    check: (part) => run(part, false),
    findExpectedType: (part) => {
      const outcome = run(part, true);
      if (
        outcome.kind !== "type_error" ||
        outcome.tag !== "hole_expected_type"
      ) {
        return null;
      }
      const expected = (
        outcome.detail as { readonly expected?: DefinyValue } | null
      )?.expected as { readonly tag?: unknown; readonly payload?: DefinyValue };
      return expected?.tag === "some" ? (expected.payload ?? null) : null;
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
    case "secret":
      return "Secret";
    case "list":
      return `List<${format(fieldOf(value.payload, "item_type"))}>`;
    case "code":
      return `Code<${format(value.payload)}>`;
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
    case "builtin": {
      // 組み込みの型は引数の型を持たないので, 引数名だけ出す (`builtin less_than(left, right)`)
      const name = String(value.payload);
      const parameters = BUILTIN_PARAMETERS.get(name);
      return parameters === undefined
        ? `builtin ${name}`
        : `builtin ${name}(${parameters.join(", ")})`;
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
 * `name` が `null` なら `part '...': ` を付けない (パーツ詳細でエラーの式の横に出すとき).
 * `resolveName` は型の中のパーツ参照をパーツ名にするのに使う
 */
export function outcomeErrorMessage(
  name: string | null,
  outcome: SelfHostedTypeCheckOutcome,
  resolveName: (partId: string) => string | undefined = () => undefined,
): string | null {
  const prefix = name === null ? "" : `part '${name}': `;
  switch (outcome.kind) {
    case "ok":
      return null;
    case "type_error": {
      const detail = formatTypeErrorDetail(outcome.detail, resolveName);
      return `${prefix}type error: ${outcome.tag}${detail === "" ? "" : ` (${detail})`}`;
    }
    case "unsupported":
      return `${prefix}not supported: ${outcome.message}`;
    case "checker_failed":
      return `${prefix}type checker failed: ${outcome.message.split("\n")[0] ?? ""}`;
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

/**
 * 最新のパーツを型環境にする (型の無いパーツは入れない. 型パーツは宣言式も入れる).
 * コンパイラ組み込みのパーツは, 型が `builtin` になるので型が無くても入れる
 */
export function typeEnvFromParts(
  parts: Iterable<LatestPart>,
): ReadonlyArray<PartTypeEntry> {
  return [...parts].flatMap((part) => {
    const builtin = compilerBuiltinName(part.expression);
    return part.partType != null || builtin !== undefined
      ? [
          {
            partId: part.partId,
            partType: part.partType,
            typeDeclaration:
              part.partType === "type" ? part.expression : undefined,
            builtin,
          },
        ]
      : [];
  });
}

/** 型環境が変わったかを比べるキー (全パーツの ID と型, 型パーツの宣言式, コンパイラ組み込みの名前から決まる) */
export function typeEnvKey(parts: Iterable<LatestPart>): string {
  return expressionContentHashSync(
    [...parts]
      .map(
        (part) =>
          `${part.partId}:${partTypeKey(part.partType)}:${
            part.partType === "type" ? (part.expressionKey ?? "") : ""
          }:${compilerBuiltinName(part.expression) ?? ""}`,
      )
      .sort(),
  );
}

/** 式の CBOR の SHA-256 (URL-safe Base64). CAS の content hash と同じ (同期版) */
export function expressionContentHashSync(expression: unknown): string {
  return bytesToUrlSafeBase64NoPad(sha256BytesSync(encodeCborItem(expression)));
}

export { expressionContentHashSync as expressionContentHash };

function partTypeKey(partType: unknown): string {
  return partType == null ? "" : expressionContentHashSync(partType);
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
  const session = createModuleCommitSession({
    typeChecker: options.typeChecker,
    latest: [...options.latestParts.values()].map(latestPartToModuleEntry),
    committed: options.committed.map(latestPartToModuleEntry),
    moduleId: options.moduleId,
  });
  const byId = new Map(options.committed.map((part) => [part.partId, part]));
  const partsOf = (ids: ReadonlyArray<string>): ReadonlyArray<LatestPart> =>
    ids.flatMap((id) => {
      const part = byId.get(id);
      return part === undefined ? [] : [part];
    });
  const results: Array<{
    readonly name: string;
    readonly outcome: SelfHostedTypeCheckOutcome;
  }> = [];
  let toCheck: ReadonlyArray<LatestPart>;
  try {
    if (!options.allowBuiltinParts) {
      for (const part of partsOf(session.withoutExpression())) {
        results.push({
          name: part.name,
          outcome: {
            kind: "unsupported",
            message: "part has no expression or type",
          },
        });
      }
    }
    toCheck = partsOf(session.toCheck());
  } catch (e) {
    return [
      ...results,
      ...options.committed.map((part) => ({
        name: part.name,
        outcome: {
          kind: "checker_failed" as const,
          message: errorMessage(e),
        },
      })),
    ];
  }
  if (toCheck.length === 0) {
    return results;
  }

  const outcomes = toCheck.map((part) => session.check(part));
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
