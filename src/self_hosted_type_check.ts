/**
 * definy 製の型チェッカー (`core.type-check-against`) でパーツの式を型検査する.
 *
 * 型チェッカー本体は stage1 で 1 度だけ Wasm にコンパイルし (`compileTypeChecker`), 全モジュールの最新のパーツと
 * コミットするパーツを書き込んで definy 製の `core.type-checker` で型環境と検査するパーツを決めてから,
 * パーツごとに検査する式と期待する型を書き込んで呼ぶ (`createTypeCheckSession`).
 * サーバーの `SubmitEvent` の検査と UI の型エラー表示が同じ関数を使う
 * (docs/self-hosting.md の「definy 製型チェッカーの実行」).
 */
import {
  argumentsByName,
  instantiateCompiledFunction,
  type CompiledFunctionInstance,
  collectReferencedParts,
  BUILTIN_PARAMETERS,
  compilerBuiltinName,
  containsHole,
  type DefinyValue,
  type Stage1CompilerInstance,
  type ValueRef,
} from "./stage1_compiler.ts";
import {
  bytesToUrlSafeBase64NoPad,
  deriveModuleIdBytesSync,
  deriveModulePartIdSync,
  encodeCborItem,
  sha256BytesSync,
} from "./cbor.ts";
import {
  field,
  isVariant,
  none,
  optionValue,
  some,
  variant,
  variantOf,
  variantPayload,
} from "./definy_value.ts";
import {
  fillHoleTypeArguments,
  inferHoleTypeArguments,
  type HoleProbeResult,
} from "./type_argument_holes.ts";

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
  /** パーツの宣言型 (型の式. `core.expression` の値) */
  readonly partType: unknown;
  /**
   * 型パーツ (`partType` が `type_type`) の宣言式. `core.type-resolve` が
   * `reference` 型を中身の型に展開するために使う
   */
  readonly typeDeclaration?: unknown;
  /**
   * コンパイラ組み込みのパーツ (`core.plus` など) なら組み込みの名前 ({@link compilerBuiltinName}).
   * 型環境ではパーツの型を `builtin(名前)` にし, 型チェッカーが呼び出しを名前で検査する
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

/** 型パーツ (宣言型が型の式 `type_type`) か */
export function isTypePartType(partType: unknown): boolean {
  // 型引数を取る型 (`core.option: (T: type) -> type`) も型パーツ (`core.is-type-part-type`)
  return (
    isVariant(partType, "type_type") ||
    isVariant(
      field(variantPayload(partType, "type_function"), "return_type"),
      "type_type",
    )
  );
}

/** 検査できないパーツ (未入力のある式・型の無いパーツ・コンパイラ組み込み) */
class UnsupportedPartError extends Error {
  override readonly name = "UnsupportedPartError";
}

/**
 * コンパイラ組み込みのパーツか. パーツの定義で決まり, モジュールやアカウントによらない.
 * 式が `{"#builtin": ...}` のパーツ (`core.plus` など) と, 式の無い型パーツ (`core.number` などの組み込みの型)
 */
export function isCompilerBuiltinPart(part: {
  readonly partType: unknown;
  readonly expression: unknown;
}): boolean {
  return (
    compilerBuiltinName(part.expression) !== undefined ||
    (part.expression == null && isTypePartType(part.partType))
  );
}

/** `core.type-check-against` に渡す `expr` と `expected_type` の値 */
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
    throw new UnsupportedPartError(
      `compiler built-in part (${builtin}) cannot be type-checked`,
    );
  }
  if (part.expression == null) {
    throw new UnsupportedPartError("part has no expression");
  }
  if (part.partType == null) {
    throw new UnsupportedPartError("part has no type");
  }
  if (!allowHoles && containsHole(part.expression)) {
    throw new UnsupportedPartError("Expression has an unfilled hole");
  }
  return { expression: part.expression, expectedType: part.partType };
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
 * プロジェクトのコミットで置き換えるモジュールをまとめて `core.type-checker` に渡すときのモジュール ID.
 * {@link NO_MODULE} と同じく `#` を含むので, 実際のモジュール ID とは一致しない
 */
const REPLACED_MODULE = "#replaced";

/**
 * `core.type-checker` に渡すパーツの一覧
 * `[{ part_id, module_id, part_type, type_declaration, expression_key, has_expression }]` を作る式.
 * パーツの型は型の式のまま渡す (型チェッカーが `core.type-ast` にし, できなければ型環境に入れない).
 * コンパイラ組み込みのパーツの型は `builtin` (名前) にする
 */
function moduleEntriesExpression(entries: ReadonlyArray<ModuleEntry>): unknown {
  return entries.map((entry) => ({
    part_id: entry.partId,
    module_id: entry.moduleId,
    part_type:
      entry.builtin === undefined
        ? entry.partType == null
          ? none()
          : some(entry.partType)
        : some(variant("builtin", entry.builtin)),
    type_declaration:
      entry.typeDeclaration == null ? none() : some(entry.typeDeclaration),
    expression_key:
      entry.expressionKey === null ? none() : some(entry.expressionKey),
    has_expression: entry.hasExpression,
  }));
}

function latestPartToModuleEntry(part: LatestPart): ModuleEntry {
  return {
    partId: part.partId,
    moduleId: part.moduleId,
    partType: part.partType,
    typeDeclaration: isTypePartType(part.partType)
      ? part.expression
      : undefined,
    expressionKey: part.expressionKey,
    hasExpression: part.expression != null,
    builtin: compilerBuiltinName(part.expression),
  };
}

function typeResultToOutcome(result: DefinyValue): SelfHostedTypeCheckOutcome {
  const value = variantOf(result);
  if (value?.tag === "ok") {
    return { kind: "ok" };
  }
  const error = variantOf(value?.payload);
  if (value?.tag === "error" && error !== undefined) {
    return typeErrorToOutcome(
      error.tag,
      (error.payload ?? null) as DefinyValue,
      null,
    );
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
    const error = variantOf(field(payload, "error"));
    if (error !== undefined) {
      return typeErrorToOutcome(
        error.tag,
        (error.payload ?? null) as DefinyValue,
        (field(payload, "expression") ?? null) as DefinyValue,
      );
    }
  }
  return { kind: "type_error", tag, detail: payload, expression };
}

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
  const expression = variant("part_reference", {
    part_definition_event_hash: options.core.typeChecker,
  });
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
   * 式の中の `{"#hole": {"probe": true}}` の位置で期待する型 (`core.type-ast` の値) を型チェッカーに聞く.
   * 他の未入力はその位置の期待する型として受け入れる. 推論する位置 (`==` の左辺など) や,
   * それより先に別の型エラーが見つかったときは `null`
   */
  readonly findExpectedType: (part: PartToCheck) => DefinyValue | null;
  /**
   * 未確定 (未入力のまま) の型引数を型チェッカーが推論した型で埋めた式. 実行・コンパイルの前に使う.
   * 型引数でない未入力か, 推論できない型引数があれば `null` (docs/type-arguments.md「未確定の型引数」)
   */
  readonly fillTypeArguments: (part: PartToCheck) => unknown;
};

/**
 * 型環境を決めて, パーツを 1 つずつ検査できるようにする. 型チェッカーのインスタンスと書き込んだ型環境を
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
}): ModuleCommitSession {
  return createModuleCommitSessionFromValues({
    typeChecker: options.typeChecker,
    latest: moduleEntriesExpression(options.latest),
    committed: moduleEntriesExpression(options.committed),
    moduleId: options.moduleId,
  });
}

type ModuleCommitSession = {
  /** 検査するパーツ (型が 1 つも変わらなければ, 式が変わったパーツと新しいパーツ) の ID */
  readonly toCheck: () => ReadonlyArray<string>;
  /** 式か型の無いパーツの ID */
  readonly withoutExpression: () => ReadonlyArray<string>;
} & TypeCheckSession;

/** {@link createModuleCommitSession} の `latest` / `committed` を definy の値 (`core.type-checker` の引数の形) で渡すもの */
function createModuleCommitSessionFromValues(options: {
  readonly typeChecker: WebAssembly.Module;
  readonly latest: unknown;
  readonly committed: unknown;
  readonly moduleId: string;
}): ModuleCommitSession {
  const { latest, committed, moduleId } = options;
  // 型環境は大きいので, インスタンスごとに 1 度だけ書き込んで definy 側で型環境を作り,
  // その環境で検査する関数 (`core.type-checker` が返すレコードの `check`) を使い回す.
  // 検査で作った値は GC が回収する. 型チェッカーが trap したら (スタック不足など) 念のため作り直す
  let current:
    | {
        readonly instance: CompiledFunctionInstance;
        readonly planPtr: ValueRef;
        readonly checkerPtr: ValueRef;
      }
    | undefined;
  const ensureInstance = (): NonNullable<typeof current> => {
    if (current === undefined) {
      const instance = instantiateCompiledFunction(options.typeChecker);
      const planPtr = instance.call({
        latest: instance.writeArgument(latest),
        committed: instance.writeArgument(committed),
        module_id: instance.writeArgument(moduleId),
      });
      current = {
        instance,
        planPtr,
        checkerPtr: instance.recordField(planPtr, "check"),
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
      if (e instanceof UnsupportedPartError) {
        return { kind: "unsupported", message: e.message };
      }
      throw e;
    }
    try {
      const { instance, checkerPtr } = ensureInstance();
      return typeResultToOutcome(
        instance.read(
          instance.callClosure(
            checkerPtr,
            argumentsByName({
              expr: instance.writeArgument(args.expression),
              expected_type: instance.writeArgument(args.expectedType),
            }),
          ),
        ),
      );
    } catch (e) {
      current = undefined;
      return { kind: "checker_failed", message: errorMessage(e) };
    }
  };
  /** 未入力を probe にした式を検査し, その位置が型引数なら推論した型を返す */
  const probeHole =
    (part: PartToCheck) =>
    (probed: unknown): HoleProbeResult => {
      const outcome = run({ ...part, expression: probed }, true);
      const inferred =
        outcome.kind === "type_error" && outcome.tag === "hole_expected_type"
          ? optionValue(field(outcome.detail, "inferred_type_argument"))
          : undefined;
      return inferred == null
        ? { kind: "other" }
        : { kind: "type_argument", type: inferred };
    };
  return {
    toCheck: () => readIds("to_check"),
    withoutExpression: () => readIds("without_expression"),
    // 未入力は, 全て推論できる型引数 (未確定の型引数) のときだけ受け付ける
    check: (part) =>
      containsHole(part.expression) &&
      inferHoleTypeArguments(part.expression, probeHole(part)) === null
        ? run(part, false)
        : run(part, true),
    fillTypeArguments: (part) =>
      fillHoleTypeArguments(part.expression, probeHole(part)),
    findExpectedType: (part) => {
      const outcome = run(part, true);
      if (
        outcome.kind !== "type_error" ||
        outcome.tag !== "hole_expected_type"
      ) {
        return null;
      }
      return (optionValue(field(outcome.detail, "expected")) ??
        null) as DefinyValue | null;
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

/**
 * `core.type-ast` の値を `List<number>` のような文字列にする. 型でなければ `null`.
 * `reference` 型は `resolveName` でパーツ名にする (分からなければ ID の先頭)
 */
export function formatTypeAst(
  value: unknown,
  resolveName: (partId: string) => string | undefined = () => undefined,
): string | null {
  const tagged = variantOf(value);
  if (tagged === undefined) {
    return null;
  }
  const format = (v: unknown): string =>
    formatTypeAst(v, resolveName) ?? JSON.stringify(v);
  const items = (v: unknown): ReadonlyArray<unknown> =>
    Array.isArray(v) ? v : [];
  const { payload } = tagged;
  switch (tagged.tag) {
    case "number":
    case "float":
    case "string":
    case "boolean":
    case "type":
      return tagged.tag;
    case "secret":
      return "Secret";
    case "list":
      return `List<${format(field(payload, "item_type"))}>`;
    case "code":
      return `Code<${format(payload)}>`;
    case "function":
      return `(${items(field(payload, "parameters"))
        .map(
          (parameter) =>
            `${String(field(parameter, "name"))}: ${format(field(parameter, "type"))}`,
        )
        .join(", ")}) -> ${format(field(payload, "return_type"))}`;
    case "record":
      return `{ ${items(payload)
        .map(
          (item) =>
            `${String(field(item, "key"))}: ${format(field(item, "field_type"))}`,
        )
        .join(", ")} }`;
    case "union":
      return items(payload)
        .map((item) => {
          const payloadType = optionValue(field(item, "payload_type"));
          const tag = String(field(item, "tag"));
          return payloadType !== undefined
            ? `${tag}(${format(payloadType)})`
            : tag;
        })
        .join(" | ");
    case "reference": {
      const partId = String(field(payload, "part_hash"));
      return resolveName(partId) ?? partId.slice(0, 8);
    }
    case "parameter":
      return String(payload);
    case "apply": {
      const partId = String(field(payload, "part_hash"));
      return `${resolveName(partId) ?? partId.slice(0, 8)}(${items(
        field(payload, "arguments"),
      )
        .map(
          (argument) =>
            `${String(field(argument, "name"))}: ${format(field(argument, "type"))}`,
        )
        .join(", ")})`;
    }
    case "builtin": {
      // 組み込みの型は引数の型を持たないので, 引数名だけ出す (`builtin less_than(left, right)`)
      const name = String(payload);
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
            typeDeclaration: isTypePartType(part.partType)
              ? part.expression
              : undefined,
            builtin,
          },
        ]
      : [];
  });
}

/** パーツを `core.type-checker` の `latest` に渡す definy の値にする (サーバーの `definy.check-commit` に渡す) */
export function latestPartsToModuleEntries(
  parts: Iterable<LatestPart>,
): unknown {
  return moduleEntriesExpression([...parts].map(latestPartToModuleEntry));
}

/**
 * definy の `definy.check-commit` が決めた型環境 (`core.type-checker` の `latest` / `committed` / `module_id`) で,
 * パーツを 1 つずつ検査して型エラーのメッセージを返す (`type_check_parts`. docs/service.md).
 * 型チェッカーが扱えないコンパイラ組み込みのパーツ (`builtin`) は受け入れる
 */
export function checkPartsInModuleCommit(options: {
  readonly typeChecker: WebAssembly.Module;
  readonly latest: unknown;
  readonly committed: unknown;
  readonly moduleId: string;
  readonly checks: ReadonlyArray<{
    readonly name: string;
    readonly expression: unknown;
    readonly partType: unknown;
    readonly builtin: boolean;
  }>;
}): ReadonlyArray<string> {
  const session = createModuleCommitSessionFromValues(options);
  return options.checks.flatMap((check) => {
    const outcome = session.check({
      expression: check.expression,
      partType: check.partType,
    });
    const message =
      outcome.kind === "unsupported" && check.builtin
        ? null
        : outcomeErrorMessage(check.name, outcome);
    return message === null ? [] : [message];
  });
}

/** 型環境が変わったかを比べるキー (全パーツの ID と型, 型パーツの宣言式, コンパイラ組み込みの名前から決まる) */
export function typeEnvKey(parts: Iterable<LatestPart>): string {
  return expressionContentHashSync(
    [...parts]
      .map(
        (part) =>
          `${part.partId}:${partTypeKey(part.partType)}:${
            isTypePartType(part.partType) ? (part.expressionKey ?? "") : ""
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
 * プロジェクトのコミットのパーツを型チェッカーで検査し, 検査したパーツの名前と結果を返す.
 * サーバーがコミットを受け付けるかの判定と, UI の変更ページのコミット前の検査が同じ関数を使う.
 *
 * - 型環境は `latestParts` (全モジュールの最新のコミットのパーツ) に, このコミットのパーツを重ねたもの
 * - パーツの型が 1 つも変わっていなければ, 式が変わったパーツ (と新しいパーツ) だけを検査する.
 *   型が変わったら, それを参照するパーツに影響するのでモジュールの全パーツを検査する
 * - コンパイラ組み込みのパーツ ({@link isCompilerBuiltinPart}) は検査せずに受け入れる (結果に含めない).
 *   組み込みかどうかはパーツの定義で決まり, モジュールやアカウントによらない
 * - 式を CAS に預けているパーツは, 呼び出し側で `expression` を埋めておく
 *   (コミットのパーツと, 型環境の型パーツ)
 */
export function checkModuleCommitParts(options: {
  readonly typeChecker: WebAssembly.Module;
  /**
   * このコミットで置き換えるモジュールの ID. プロジェクトのコミットはプロジェクトの全モジュールを置き換える
   * (コミットのモジュールと, 今のプロジェクトのモジュール. docs/project.md)
   */
  readonly replacedModuleIds: ReadonlySet<string>;
  readonly committed: ReadonlyArray<LatestPart>;
  readonly latestParts: ReadonlyMap<string, LatestPart>;
  /**
   * パーツの定義の式 (docs/part-definition.md). コミットの型環境で `core.part-content` になるかを検査する.
   * ユーザーが作った定義のパーツの呼び出しで定義したパーツのもの
   */
  readonly definitionChecks?: ReadonlyArray<{
    readonly name: string;
    readonly expression: unknown;
  }>;
}): ReadonlyArray<{
  readonly name: string;
  readonly outcome: SelfHostedTypeCheckOutcome;
}> {
  // `core.type-checker` は 1 つのモジュールへのコミットとして検査するので, 置き換えるモジュールのパーツを
  // 1 つのモジュール (REPLACED_MODULE) のものとして渡す
  const session = createModuleCommitSession({
    typeChecker: options.typeChecker,
    latest: [...options.latestParts.values()].map((part) =>
      latestPartToModuleEntry(
        options.replacedModuleIds.has(part.moduleId)
          ? { ...part, moduleId: REPLACED_MODULE }
          : part,
      ),
    ),
    committed: options.committed.map((part) =>
      latestPartToModuleEntry({ ...part, moduleId: REPLACED_MODULE }),
    ),
    moduleId: REPLACED_MODULE,
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
    for (const part of partsOf(session.withoutExpression())) {
      if (!isCompilerBuiltinPart(part)) {
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
  const partContentType = variant("part_reference", {
    part_definition_event_hash: deriveModulePartIdSync(
      deriveModuleIdBytesSync("core"),
      "part-content",
    ),
  });
  for (const definition of options.definitionChecks ?? []) {
    results.push({
      name: definition.name,
      outcome: session.check({
        expression: definition.expression,
        partType: partContentType,
      }),
    });
  }
  if (toCheck.length === 0) {
    return results;
  }

  const outcomes = toCheck.map((part) => session.check(part));
  toCheck.forEach((part, i) => {
    const outcome = outcomes[i];
    if (
      outcome === undefined ||
      (outcome.kind === "unsupported" && isCompilerBuiltinPart(part))
    ) {
      return;
    }
    results.push({ name: part.name, outcome });
  });
  return results;
}
