import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveModuleIdBytes, deriveModulePartId } from "../worker/cbor.ts";
import { resolvePartPlaceholders } from "./seed_parts.ts";
import {
  checkParts,
  compileTypeChecker,
  createTypeCheckSession,
  formatTypeAst,
  isTypePartType,
  outcomeErrorMessage,
  type PartTypeEntry,
  type PartToCheck,
} from "./self_hosted_type_check.ts";
import {
  compilerBuiltinName,
  createStage1Compiler,
  type DefinyValue,
} from "./stage1_compiler.ts";
import { expressionToLayoutNode } from "./tree_layout/ast_to_layout.ts";
import type { PathStep } from "./tree_layout/types.ts";
import {
  EXPECTED_TYPE_PROBE,
  expectedTypeFromTypeAst,
  probeExpressionAt,
  findExpressionTypeAt,
} from "./tree_layout/type_inference.ts";
import { findTypeErrorPath } from "./tree_layout/type_error_location.ts";
import {
  patternVariantsFromTypeAst,
  probeMatchTargetType,
} from "./tree_layout/match_pattern.ts";

type SeedPart = {
  readonly id: string;
  readonly name: string;
  readonly partType: unknown;
  readonly expression: unknown;
};

async function loadSeedParts(): Promise<ReadonlyArray<SeedPart>> {
  const parts: SeedPart[] = [];
  for (const file of readdirSync("seeds")) {
    if (!file.endsWith(".json") || file.startsWith("seed_bundle")) {
      continue;
    }
    const seed = JSON.parse(readFileSync(`seeds/${file}`, "utf8")) as {
      readonly module_name: string;
      readonly parts: ReadonlyArray<Readonly<Record<string, unknown>>>;
    };
    const moduleId = await deriveModuleIdBytes(seed.module_name);
    for (const part of seed.parts) {
      const name = String(part.name);
      parts.push({
        id: await deriveModulePartId(moduleId, name),
        name: `${seed.module_name}.${name}`,
        partType: await resolvePartPlaceholders(part.part_type ?? null),
        expression: await resolvePartPlaceholders(part.expression ?? null),
      });
    }
  }
  return parts;
}

const coreModuleId = await deriveModuleIdBytes("core");

/** seed の core のパーツ (`core.plus` などのコンパイラ組み込み) の呼び出し */
async function coreCall(
  name: string,
  args: Readonly<Record<string, unknown>>,
): Promise<unknown> {
  return {
    "#call": {
      function: {
        "#part_reference": {
          part_definition_event_hash: await deriveModulePartId(
            coreModuleId,
            name,
          ),
        },
      },
      arguments: Object.entries(args).map(([argName, value]) => ({
        name: argName,
        value,
      })),
    },
  };
}

/** seed の `core.type-checker` を stage1 でコンパイルし, seed の全パーツを型環境にする */
function compileSeedTypeChecker(parts: ReadonlyArray<SeedPart>): {
  readonly typeChecker: WebAssembly.Module;
  readonly env: ReadonlyArray<PartTypeEntry>;
} {
  const byId = new Map(parts.map((part) => [part.id, part]));
  const typeCheckerPart = parts.find(
    (part) => part.name === "core.type-checker",
  );
  expect(typeCheckerPart).toBeDefined();
  const env: ReadonlyArray<PartTypeEntry> = parts.map((part) => ({
    partId: part.id,
    partType: part.partType,
    typeDeclaration: isTypePartType(part.partType)
      ? part.expression
      : undefined,
    builtin: compilerBuiltinName(part.expression),
  }));
  const compileStarted = performance.now();
  const typeChecker = new WebAssembly.Module(
    compileTypeChecker({
      compiler: createStage1Compiler(
        new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
      ),
      core: { typeChecker: typeCheckerPart?.id ?? "" },
      resolvePart: (id) => byId.get(id)?.expression ?? undefined,
    }) as unknown as BufferSource,
  );
  console.log(
    `compiled the type checker in ${Math.round(performance.now() - compileStarted)}ms`,
  );
  return { typeChecker, env };
}

describe("self-hosted type check (stage1)", () => {
  it("accepts every seed part except compiler builtins", async () => {
    const parts = await loadSeedParts();
    const { typeChecker, env } = compileSeedTypeChecker(parts);
    const targets = parts.filter(
      (part) => part.expression != null && part.partType != null,
    );
    const started = performance.now();
    const outcomes = checkParts({
      typeChecker,
      parts: targets.map((part): PartToCheck => ({
        expression: part.expression,
        partType: part.partType,
      })),
      env,
    });
    console.log(
      `checked ${targets.length} parts in ${Math.round(performance.now() - started)}ms`,
    );
    const failures = targets
      .map((part, i) => ({ name: part.name, outcome: outcomes[i] }))
      .filter(({ outcome }) => outcome?.kind !== "ok");
    console.log(JSON.stringify(failures.slice(0, 20), null, 1));
    expect(
      failures.filter(({ outcome }) => outcome?.kind !== "unsupported"),
    ).toEqual([]);
  }, 600_000);

  it("型エラーにエラーを見つけた一番内側の式を付ける", async () => {
    const { typeChecker, env } = compileSeedTypeChecker(await loadSeedParts());
    const bad = { "#string": "x" };
    const expression = {
      "#function": {
        parameters: [{ parameter_id: 0, parameter_name: "n" }],
        body: await coreCall("plus", {
          left: { "#variable": { variable_id: 0 } },
          right: await coreCall("multiply", {
            left: { "#number": 2 },
            right: bad,
          }),
        }),
      },
    };
    const [outcome] = checkParts({
      typeChecker,
      parts: [
        {
          expression,
          partType: {
            "#function": {
              parameters: [{ name: "n", type: { "#number": null } }],
              return_type: { "#number": null },
            },
          },
        },
      ],
      env,
    });
    expect(outcome).toMatchObject({
      kind: "type_error",
      tag: "type_mismatch",
      expression: bad,
    });
    expect(
      outcome?.kind === "type_error"
        ? findTypeErrorPath(
            expressionToLayoutNode(expression),
            expression,
            outcome.expression,
          )
        : null,
    ).toEqual([
      "functionBody",
      { kind: "callArgument", index: 1 },
      { kind: "callArgument", index: 1 },
    ]);
  }, 600_000);

  it("コンパイラ組み込みの呼び出しの引数を definy 側で検査する", async () => {
    const { typeChecker, env } = compileSeedTypeChecker(await loadSeedParts());
    const numberPart = (expression: unknown): PartToCheck => ({
      expression,
      partType: { "#number": null },
    });
    const outcomes = checkParts({
      typeChecker,
      parts: [
        // 引数は名前で対応させるので, 順番は組み込みの引数名の順と違ってよい
        numberPart(
          await coreCall("minus", {
            right: { "#number": 1 },
            left: { "#number": 2 },
          }),
        ),
        // 引数名が組み込みの引数名と違う
        numberPart(
          await coreCall("plus", {
            a: { "#number": 1 },
            b: { "#number": 2 },
          }),
        ),
        // 型の無い組み込み (core.list-get) も型チェッカーが要素の型を求める. 範囲外があるので option を返す
        {
          partType: {
            "#union": [
              { tag: "none", payload_type: { "#none": null } },
              { tag: "some", payload_type: { "#some": { "#number": null } } },
            ],
          },
          expression: await coreCall("list-get", {
            list: { "#list": [{ "#number": 1 }] },
            index: { "#number": 0 },
          }),
        },
        numberPart(
          await coreCall("list-get", {
            list: { "#list": [{ "#string": "a" }] },
            index: { "#number": 0 },
          }),
        ),
      ],
      env,
    });
    expect(outcomes.map((outcome) => outcome.kind)).toEqual([
      "ok",
      "type_error",
      "ok",
      "type_error",
    ]);
    expect(outcomes[1]).toMatchObject({ tag: "invalid_type_declaration" });
  }, 600_000);

  it("呼び出しの引数とラムダ式の引数は名前で対応させ, 順番は自由", async () => {
    const { typeChecker, env } = compileSeedTypeChecker(await loadSeedParts());
    const functionType = {
      "#function": {
        parameters: [
          { name: "a", type: { "#number": null } },
          { name: "b", type: { "#string": null } },
        ],
        return_type: { "#number": null },
      },
    };
    const lambda = (names: ReadonlyArray<string>, body: unknown) => ({
      "#function": {
        parameters: names.map((name, i) => ({
          parameter_id: i,
          parameter_name: name,
        })),
        body,
      },
    });
    const outcomes = checkParts({
      typeChecker,
      parts: [
        // 宣言の型と違う順番の引数のラムダ式. a は number
        {
          partType: functionType,
          expression: lambda(["b", "a"], { "#variable": { variable_id: 1 } }),
        },
        // b は string なので number を返せない
        {
          partType: functionType,
          expression: lambda(["b", "a"], { "#variable": { variable_id: 0 } }),
        },
        // 同じ名前の引数は書けない
        {
          partType: functionType,
          expression: lambda(["a", "a"], { "#number": 0 }),
        },
        // 宣言と違う順番で引数を渡す
        {
          partType: { "#boolean": null },
          expression: await coreCall("list-contains-string", {
            index: { "#number": 0 },
            target: { "#string": "a" },
            list: { "#list": [{ "#string": "a" }] },
          }),
        },
        // 足りない引数
        {
          partType: { "#boolean": null },
          expression: await coreCall("list-contains-string", {
            index: { "#number": 0 },
            list: { "#list": [{ "#string": "a" }] },
          }),
        },
      ],
      env,
    });
    expect(outcomes.map((outcome) => outcome.kind)).toEqual([
      "ok",
      "type_error",
      "type_error",
      "ok",
      "type_error",
    ]);
  }, 600_000);

  it("浮動小数のリテラルの型は float で, 整数とは別の型", async () => {
    const { typeChecker, env } = compileSeedTypeChecker(await loadSeedParts());
    const float = (mantissa: number, exponent: number) => ({
      "#float": { mantissa, exponent },
    });
    const outcomes = checkParts({
      typeChecker,
      parts: [
        { partType: { "#float": null }, expression: float(15, -1) },
        {
          partType: { "#float": null },
          expression: await coreCall("float-plus", {
            left: float(1, -1),
            right: float(2, -1),
          }),
        },
        // 整数は浮動小数として使えない
        {
          partType: { "#float": null },
          expression: await coreCall("float-plus", {
            left: { "#number": 1 },
            right: float(2, -1),
          }),
        },
        { partType: { "#number": null }, expression: float(1, 0) },
        {
          partType: { "#number": null },
          expression: await coreCall("float-floor", { value: float(15, -1) }),
        },
        {
          partType: { "#boolean": null },
          expression: await coreCall("equal", {
            left: float(1, 0),
            right: await coreCall("float-from-integer", {
              value: { "#number": 1 },
            }),
          }),
        },
      ],
      env,
    });
    expect(outcomes.map((outcome) => outcome.kind)).toEqual([
      "ok",
      "ok",
      "type_error",
      "type_error",
      "ok",
      "ok",
    ]);
  }, 600_000);

  it("関数は値として書けない (関数の引数にはラムダ式を書く)", async () => {
    const { typeChecker, env } = compileSeedTypeChecker(await loadSeedParts());
    const mapperType = {
      "#function": {
        parameters: [
          {
            name: "f",
            type: {
              "#function": {
                parameters: [{ name: "item", type: { "#number": null } }],
                return_type: { "#number": null },
              },
            },
          },
        ],
        return_type: { "#list": { item_type: { "#number": null } } },
      },
    };
    const mapWith = async (f: unknown): Promise<PartToCheck> => ({
      partType: mapperType,
      expression: {
        "#function": {
          parameters: [{ parameter_id: 0, parameter_name: "f" }],
          body: await coreCall("list-map", {
            f,
            xs: { "#list": [{ "#number": 1 }] },
          }),
        },
      },
    });
    const plusReference = (
      (await coreCall("plus", {})) as {
        readonly "#call": { readonly function: unknown };
      }
    )["#call"].function;
    const outcomes = checkParts({
      typeChecker,
      parts: [
        // 関数型の引数をそのまま渡す
        await mapWith({ "#variable": { variable_id: 0 } }),
        // ラムダ式で包んで渡す
        await mapWith({
          "#function": {
            parameters: [{ parameter_id: 1, parameter_name: "item" }],
            body: {
              "#call": {
                function: { "#variable": { variable_id: 0 } },
                arguments: [
                  { name: "item", value: { "#variable": { variable_id: 1 } } },
                ],
              },
            },
          },
        }),
        // 関数のパーツを呼ばずに値にする
        {
          partType: { "#number": null },
          expression: {
            "#let": {
              variable_id: 0,
              variable_name: "g",
              value: plusReference,
              body: { "#number": 1 },
            },
          },
        },
      ],
      env,
    });
    expect(outcomes.map((outcome) => outcome.kind)).toEqual([
      "type_error",
      "ok",
      "type_error",
    ]);
    expect(outcomes[0]).toMatchObject({
      tag: "function_not_called",
      expression: { "#variable": { variable_id: 0 } },
    });
    expect(outcomes[2]).toMatchObject({ tag: "function_not_called" });
  }, 600_000);

  it("文字列の値の match は腕のタグを文字列リテラルとして選び, `_` の腕が要る", async () => {
    const { typeChecker, env } = compileSeedTypeChecker(await loadSeedParts());
    const stringMatch = (
      arms: ReadonlyArray<readonly [string, unknown]>,
    ): PartToCheck => ({
      partType: { "#number": null },
      expression: {
        "#match": {
          target: { "#string": "plus" },
          arms: arms.map(([tag, body]) => ({
            pattern: tag === "_" ? { "#any": null } : { "#string": tag },
            body,
          })),
        },
      },
    });
    const outcomes = checkParts({
      typeChecker,
      parts: [
        stringMatch([
          ["plus", { "#number": 1 }],
          ["_", { "#number": 0 }],
        ]),
        stringMatch([["plus", { "#number": 1 }]]),
        stringMatch([
          ["plus", { "#number": 1 }],
          ["_", { "#string": "zero" }],
        ]),
      ],
      env,
    });
    expect(outcomes.map((outcome) => outcome.kind)).toEqual([
      "ok",
      "type_error",
      "type_error",
    ]);
    expect(outcomes[1]).toMatchObject({ tag: "non_exhaustive_match" });
  }, 600_000);

  it("パターンは木で, ネストしたパターンで束縛した変数の型は中の値の型になる", async () => {
    const { typeChecker, env } = compileSeedTypeChecker(await loadSeedParts());
    const any = { "#any": null };
    const variantPattern = (tag: string, payload: unknown = any) => ({
      "#variant": { tag, payload },
    });
    // option<option<number>>
    const nestedOption = await coreCall("list-get", {
      list: {
        "#list": [
          await coreCall("list-get", {
            list: { "#list": [{ "#number": 5 }] },
            index: { "#number": 0 },
          }),
        ],
      },
      index: { "#number": 0 },
    });
    const match = (
      target: unknown,
      arms: ReadonlyArray<readonly [unknown, unknown]>,
    ): PartToCheck => ({
      partType: { "#number": null },
      expression: {
        "#match": {
          target,
          arms: arms.map(([pattern, body]) => ({ pattern, body })),
        },
      },
    });
    const x = { "#bind": { variable_id: 1, variable_name: "x" } };
    const outcomes = checkParts({
      typeChecker,
      parts: [
        match(nestedOption, [
          [
            variantPattern("some", variantPattern("some", x)),
            { "#variable": { variable_id: 1 } },
          ],
          [variantPattern("some", variantPattern("none")), { "#number": 1 }],
          [variantPattern("none"), { "#number": 2 }],
        ]),
        // 中のタグが型に無い
        match(nestedOption, [
          [variantPattern("some", variantPattern("other")), { "#number": 1 }],
          [any, { "#number": 2 }],
        ]),
        // some(none) が無いので網羅していない
        match(nestedOption, [
          [
            variantPattern("some", variantPattern("some", x)),
            { "#variable": { variable_id: 1 } },
          ],
          [variantPattern("none"), { "#number": 2 }],
        ]),
        // 数値のリテラルのパターン
        match({ "#number": 3 }, [
          [{ "#number": 3 }, { "#number": 1 }],
          [x, { "#variable": { variable_id: 1 } }],
        ]),
        // 数値に文字列のパターン
        match({ "#number": 3 }, [
          [{ "#string": "3" }, { "#number": 1 }],
          [any, { "#number": 2 }],
        ]),
      ],
      env,
    });
    expect(outcomes.map((outcome) => outcome.kind)).toEqual([
      "ok",
      "type_error",
      "type_error",
      "ok",
      "type_error",
    ]);
    expect(outcomes[2]).toMatchObject({
      tag: "non_exhaustive_match",
      detail: { missing_tag: "some" },
    });
    expect(outcomes[4]).toMatchObject({ tag: "type_mismatch" });
  }, 600_000);

  it("型パーツの参照だけで循環する型パーツの宣言は型エラーで, その型の値の検査も止まる", async () => {
    const { typeChecker, env } = compileSeedTypeChecker(await loadSeedParts());
    const reference = (id: string) => ({
      "#part_reference": { part_definition_event_hash: id },
    });
    const cycleEnv: ReadonlyArray<PartTypeEntry> = [
      ...env,
      {
        partId: "cycleA",
        partType: { "#type": null },
        typeDeclaration: reference("cycleB"),
        builtin: undefined,
      },
      {
        partId: "cycleB",
        partType: { "#type": null },
        typeDeclaration: reference("cycleA"),
        builtin: undefined,
      },
      {
        partId: "aliasOfNumber",
        partType: { "#type": null },
        typeDeclaration: reference("numberType"),
        builtin: undefined,
      },
      {
        partId: "numberType",
        partType: { "#type": null },
        typeDeclaration: { "#type_number": null },
        builtin: undefined,
      },
    ];
    const outcomes = checkParts({
      typeChecker,
      parts: [
        { partType: { "#type": null }, expression: reference("cycleB") },
        {
          partType: { "#reference": { part_hash: "cycleA" } },
          expression: { "#number": 1 },
        },
        { partType: { "#type": null }, expression: reference("numberType") },
        {
          partType: { "#reference": { part_hash: "aliasOfNumber" } },
          expression: { "#number": 1 },
        },
      ],
      env: cycleEnv,
    });
    expect(outcomes).toMatchObject([
      { kind: "type_error", tag: "invalid_type_declaration" },
      { kind: "type_error", tag: "type_mismatch" },
      { kind: "ok" },
      { kind: "ok" },
    ]);
  }, 600_000);

  it("quote 式の型は Code<中の式の型> で, 中の式は外の変数を使えない", async () => {
    const parts = await loadSeedParts();
    const { typeChecker, env } = compileSeedTypeChecker(parts);
    const coreExpressionId = parts.find(
      (part) => part.name === "core.expression",
    )?.id;
    const quote = (expression: unknown): unknown => ({ "#quote": expression });
    const incrementType = {
      "#function": {
        parameters: [{ name: "n", type: { "#number": null } }],
        return_type: { "#number": null },
      },
    };
    const increment = {
      "#function": {
        parameters: [{ parameter_id: 0, parameter_name: "n" }],
        body: await coreCall("plus", {
          left: { "#variable": { variable_id: 0 } },
          right: { "#number": 1 },
        }),
      },
    };
    const outcomes = checkParts({
      typeChecker,
      parts: [
        {
          partType: { "#code": { "#number": null } },
          expression: quote({ "#number": 1 }),
        },
        {
          partType: { "#code": { "#number": null } },
          expression: quote({ "#string": "x" }),
        },
        { partType: { "#code": incrementType }, expression: quote(increment) },
        // Code<T> の値は core.code のレコードなので expression を取り出せる
        // (ラムダ式は期待する型が無いと推論できないので, ここでは数の式)
        {
          partType: { "#reference": { part_hash: coreExpressionId } },
          expression: {
            "#record_get": {
              record: quote({ "#number": 1 }),
              key: "expression",
            },
          },
        },
        // quote の中から外の変数は使えない
        {
          partType: {
            "#function": {
              parameters: [{ name: "x", type: { "#number": null } }],
              return_type: { "#code": { "#number": null } },
            },
          },
          expression: {
            "#function": {
              parameters: [{ parameter_id: 0, parameter_name: "x" }],
              body: quote({ "#variable": { variable_id: 0 } }),
            },
          },
        },
        // 期待する型が無い位置 (let) でも推論できる
        {
          partType: { "#code": { "#string": null } },
          expression: {
            "#let": {
              variable_id: 0,
              variable_name: "c",
              value: quote({ "#string": "x" }),
              body: { "#variable": { variable_id: 0 } },
            },
          },
        },
      ],
      env,
    });
    expect(outcomes.map((outcome) => outcome.kind)).toEqual([
      "ok",
      "type_error",
      "ok",
      "ok",
      "type_error",
      "ok",
    ]);
    expect(outcomes[1]).toMatchObject({ tag: "type_mismatch" });
    expect(outcomes[4]).toMatchObject({ tag: "undefined_variable" });
    expect(formatTypeAst({ "#code": { "#number": null } })).toBe(
      "Code<number>",
    );
  }, 600_000);

  it("シークレットリテラルの型は Secret で, 文字列としては使えず中身も読めない", async () => {
    const parts = await loadSeedParts();
    const { typeChecker, env } = compileSeedTypeChecker(parts);
    const secret = {
      "#secret": {
        id: "test-secret",
        label: "テスト",
        allowed_url_prefixes: ["https://example.com/"],
      },
    };
    const outcomes = checkParts({
      typeChecker,
      parts: [
        { partType: { "#secret": null }, expression: secret },
        // 文字列として使えない
        { partType: { "#string": null }, expression: secret },
        // 中身 (id) は読めない
        {
          partType: { "#string": null },
          expression: { "#record_get": { record: secret, key: "id" } },
        },
        // 文字列はシークレットにならない
        { partType: { "#secret": null }, expression: { "#string": "token" } },
      ],
      env,
    });
    expect(outcomes.map((outcome) => outcome.kind)).toEqual([
      "ok",
      "type_error",
      "type_error",
      "type_error",
    ]);
    expect(formatTypeAst({ "#secret": null })).toBe("Secret");
  }, 600_000);

  it("未入力 (probe) の位置で期待する型を返す", async () => {
    const parts = await loadSeedParts();
    const { typeChecker, env } = compileSeedTypeChecker(parts);
    const session = createTypeCheckSession({ typeChecker, env });
    const stdAbs = parts.find((part) => part.name === "std.abs");
    const numberFunction = {
      "#function": {
        parameters: [{ name: "n", type: { "#number": null } }],
        return_type: { "#number": null },
      },
    };
    const inBody = (body: unknown): unknown => ({
      "#function": {
        parameters: [{ parameter_id: 0, parameter_name: "n" }],
        body,
      },
    });
    const expectedAt = (
      expression: unknown,
      partType: unknown = numberFunction,
    ) =>
      expectedTypeFromTypeAst(
        session.findExpectedType({ expression, partType }),
      );
    // 演算の右辺 (ほかの未入力はその位置の型として受け入れる)
    expect(
      expectedAt(
        probeExpressionAt(
          inBody(
            await coreCall("plus", {
              left: { "#hole": { probe: false } },
              right: { "#hole": { probe: false } },
            }),
          ),
          ["functionBody", { kind: "callArgument", index: 1 }],
        ),
      ),
    ).toBe("number");
    // パーツの呼び出しの引数は呼び出し先の引数の型
    expect(
      expectedAt(
        inBody({
          "#call": {
            function: {
              "#part_reference": { part_definition_event_hash: stdAbs?.id },
            },
            arguments: [{ name: "x", value: EXPECTED_TYPE_PROBE }],
          },
        }),
      ),
    ).toBe("number");
    expect(
      expectedAt(
        await coreCall("string-concat", {
          left: EXPECTED_TYPE_PROBE,
          right: { "#hole": { probe: false } },
        }),
        { "#string": null },
      ),
    ).toBe("string");
    // 関数の本体はパーツの型の戻り値の型
    expect(
      expectedAt(
        probeExpressionAt(inBody({ "#hole": { probe: false } }), [
          "functionBody",
        ]),
      ),
    ).toBe("number");
    // 推論する位置 (== の左辺) では分からない
    expect(
      session.findExpectedType({
        expression: await coreCall("equal", {
          left: EXPECTED_TYPE_PROBE,
          right: { "#number": 1 },
        }),
        partType: { "#boolean": null },
      }),
    ).toBeNull();
  }, 600_000);

  it("式を [式, probe] にしてその式の型を聞く (ホバーの表示)", async () => {
    const parts = await loadSeedParts();
    const { typeChecker, env } = compileSeedTypeChecker(parts);
    const session = createTypeCheckSession({ typeChecker, env });
    const stdAbs = parts.find((part) => part.name === "std.abs");
    const partType = {
      "#function": {
        parameters: [{ name: "n", type: { "#number": null } }],
        return_type: { "#number": null },
      },
    };
    const absReference = {
      "#part_reference": { part_definition_event_hash: stdAbs?.id },
    };
    const expression = {
      "#function": {
        parameters: [{ parameter_id: 0, parameter_name: "n" }],
        body: await coreCall("plus", {
          left: {
            "#call": {
              function: absReference,
              arguments: [
                { name: "x", value: { "#variable": { variable_id: 0 } } },
              ],
            },
          },
          right: { "#number": 1 },
        }),
      },
    };
    const typeAt = async (
      path: ReadonlyArray<PathStep>,
    ): Promise<string | null> => {
      const found = await findExpressionTypeAt(
        session.findExpectedType,
        partType,
        expression,
        path,
      );
      return found === null
        ? null
        : `${found.kind} ${formatTypeAst(found.type) ?? ""}`;
    };
    const left = ["functionBody", { kind: "callArgument", index: 0 }] as const;
    // 引数の型を書かない関数は推論できないので, 期待する型 (パーツの型)
    expect(await typeAt([])).toBe("expected (n: number) -> number");
    expect(await typeAt(["functionBody"])).toBe("inferred number");
    expect(await typeAt(left)).toBe("inferred number");
    expect(await typeAt([...left, { kind: "callArgument", index: 0 }])).toBe(
      "inferred number",
    );
    expect(
      await typeAt(["functionBody", { kind: "callArgument", index: 1 }]),
    ).toBe("inferred number");
    // 未入力は推論できないので, 期待する型
    const withHole = {
      "#function": {
        ...expression["#function"],
        body: { "#hole": { probe: false } },
      },
    };
    expect(
      await findExpressionTypeAt(session.findExpectedType, partType, withHole, [
        "functionBody",
      ]).then((found) => found?.kind),
    ).toBe("expected");
  }, 600_000);

  it("match の対象の型を聞いてパターンで選べるタグを求める", async () => {
    const parts = await loadSeedParts();
    const { typeChecker, env } = compileSeedTypeChecker(parts);
    const session = createTypeCheckSession({ typeChecker, env });
    const optionSample = parts.find(
      (part) => part.name === "sample.match-option-sample",
    );
    const optionNumber = parts.find(
      (part) => part.name === "sample.option-number",
    );
    const toVariants = (type: DefinyValue | null) =>
      patternVariantsFromTypeAst(
        type,
        new Map(parts.map((part) => [part.id, part])),
      );
    // 型パーツ (sample.option-number) を指定した Variant は, その型パーツの型と推論する
    const optionType = session.findExpectedType({
      expression: probeMatchTargetType(optionSample?.expression, [
        { kind: "matchArmPattern", index: 0 },
      ]),
      partType: optionSample?.partType,
    });
    expect(optionType).toEqual({
      "#reference": { part_hash: optionNumber?.id },
    });
    expect(toVariants(optionType)).toEqual([
      { tag: "none", hasPayload: false },
      { tag: "some", hasPayload: true },
    ]);
    const variant = (
      tag: string,
      payload: unknown,
      typePart: unknown,
    ): unknown => ({
      "#variant": {
        tag,
        payload: payload === null ? { "#none": null } : { "#some": payload },
        type_part:
          typePart === undefined || typePart === null
            ? { "#none": null }
            : { "#some": typePart },
      },
    });
    // 型パーツを指定しない Variant は, そのタグだけの直和型 (== の左辺は推論する位置)
    expect(
      session.findExpectedType({
        expression: await coreCall("equal", {
          left: {
            "#list": [
              variant("some", { "#number": 1 }, null),
              EXPECTED_TYPE_PROBE,
            ],
          },
          right: { "#hole": { probe: false } },
        }),
        partType: { "#boolean": null },
      }),
    ).toMatchObject({ "#union": [{ tag: "some" }] });
    // 型パーツにないタグや合わない値は型エラー
    const checkVariant = (expression: unknown) =>
      checkParts({
        typeChecker,
        parts: [
          {
            expression,
            partType: { "#reference": { part_hash: optionNumber?.id } },
          },
        ],
        env,
      })[0]?.kind;
    expect(
      checkVariant(variant("some", { "#number": 1 }, optionNumber?.id)),
    ).toBe("ok");
    expect(
      checkParts({
        typeChecker,
        parts: [
          {
            expression: await coreCall("equal", {
              left: variant("other", null, optionNumber?.id),
              right: variant("none", null, optionNumber?.id),
            }),
            partType: { "#boolean": null },
          },
        ],
        env,
      })[0]?.kind,
    ).toBe("type_error");
    expect(
      checkParts({
        typeChecker,
        parts: [
          {
            expression: await coreCall("equal", {
              left: variant("some", { "#string": "x" }, optionNumber?.id),
              right: variant("none", null, optionNumber?.id),
            }),
            partType: { "#boolean": null },
          },
        ],
        env,
      })[0]?.kind,
    ).toBe("type_error");
    // 型パーツ (core.expression) の値の match は, 型パーツの型宣言のタグ
    const expressionPart = parts.find(
      (part) => part.name === "core.expression",
    );
    const type = session.findExpectedType({
      expression: probeMatchTargetType(
        {
          "#function": {
            parameters: [{ parameter_id: 0, parameter_name: "e" }],
            body: {
              "#match": {
                target: { "#variable": { variable_id: 0 } },
                arms: [
                  {
                    pattern: {
                      "#variant": {
                        tag: "number",
                        payload: {
                          "#bind": { variable_id: 1, variable_name: "n" },
                        },
                      },
                    },
                    body: { "#variable": { variable_id: 1 } },
                  },
                  { pattern: { "#any": null }, body: { "#number": 0 } },
                ],
              },
            },
          },
        },
        ["functionBody", { kind: "matchArmPattern", index: 0 }],
      ),
      partType: {
        "#function": {
          parameters: [
            {
              name: "e",
              type: { "#reference": { part_hash: expressionPart?.id } },
            },
          ],
          return_type: { "#number": null },
        },
      },
    });
    const variants = toVariants(type);
    expect(variants).toContainEqual({ tag: "number", hasPayload: true });
    expect(variants).toContainEqual({ tag: "type_number", hasPayload: false });
  }, 600_000);

  it("型エラーの型を読める形にする", () => {
    const number = { "#number": null };
    const listOfUser = {
      "#list": { item_type: { "#reference": { part_hash: "user-id" } } },
    };
    expect(
      formatTypeAst(listOfUser, (id) =>
        id === "user-id" ? "app.user" : undefined,
      ),
    ).toBe("List<app.user>");
    expect(
      formatTypeAst({
        "#function": {
          parameters: [{ name: "n", type: number }],
          return_type: {
            "#union": [
              { tag: "none", payload_type: { "#none": null } },
              { tag: "some", payload_type: { "#some": number } },
            ],
          },
        },
      }),
    ).toBe("(n: number) -> none | some(number)");
    expect(
      outcomeErrorMessage("bad", {
        kind: "type_error",
        tag: "type_mismatch",
        detail: { expected: number, actual: { "#string": null } },
        expression: null,
      }),
    ).toBe(
      "part 'bad': type error: type_mismatch (expected: number, actual: string)",
    );
  });
});
