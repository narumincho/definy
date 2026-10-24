import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveModuleIdBytes, deriveModulePartId } from "../worker/cbor.ts";
import {
  devSystemAccountBytes,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import {
  checkParts,
  compileTypeChecker,
  createTypeCheckSession,
  formatTypeAst,
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
import {
  expressionToSelfHostedValue,
  findTypeErrorPath,
} from "./tree_layout/type_error_location.ts";
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
  const account = await devSystemAccountBytes();
  const parts: SeedPart[] = [];
  for (const file of readdirSync("seeds")) {
    if (!file.endsWith(".json") || file.startsWith("seed_bundle")) {
      continue;
    }
    const seed = JSON.parse(readFileSync(`seeds/${file}`, "utf8")) as {
      readonly module_name: string;
      readonly parts: ReadonlyArray<Readonly<Record<string, unknown>>>;
    };
    const moduleId = await deriveModuleIdBytes(account, seed.module_name);
    for (const part of seed.parts) {
      const name = String(part.name);
      parts.push({
        id: await deriveModulePartId(moduleId, name),
        name: `${seed.module_name}.${name}`,
        partType: await resolvePartPlaceholders(
          part.part_type ?? null,
          account,
        ),
        expression: await resolvePartPlaceholders(
          part.expression ?? null,
          account,
        ),
      });
    }
  }
  return parts;
}

const coreModuleId = await deriveModuleIdBytes(
  await devSystemAccountBytes(),
  "core",
);

/** seed の core のパーツ (`core.plus` などのコンパイラ組み込み) の呼び出し */
async function coreCall(
  name: string,
  args: Readonly<Record<string, unknown>>,
): Promise<unknown> {
  return {
    Call: {
      function: {
        PartReference: {
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
    typeDeclaration: part.partType === "type" ? part.expression : undefined,
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
    const bad = { String: { value: "x" } };
    const expression = {
      Function: {
        parameters: [{ parameter_id: 0, parameter_name: "n" }],
        body: await coreCall("plus", {
          left: { Variable: { variable_id: 0 } },
          right: await coreCall("multiply", {
            left: { Number: { value: 2 } },
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
            function: {
              parameters: [{ name: "n", type: "number" }],
              return_type: "number",
            },
          },
        },
      ],
      env,
    });
    expect(outcome).toMatchObject({
      kind: "type_error",
      tag: "type_mismatch",
      expression: expressionToSelfHostedValue(bad),
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
      partType: "number",
    });
    const outcomes = checkParts({
      typeChecker,
      parts: [
        // 引数の順番が組み込みの引数名の順と違う
        numberPart(
          await coreCall("minus", {
            right: { Number: { value: 1 } },
            left: { Number: { value: 2 } },
          }),
        ),
        // 引数名が組み込みの引数名と違う
        numberPart(
          await coreCall("plus", {
            a: { Number: { value: 1 } },
            b: { Number: { value: 2 } },
          }),
        ),
        // 型の無い組み込み (core.list-get) も型チェッカーが要素の型を求める
        numberPart(
          await coreCall("list-get", {
            list: { ListLiteral: { items: [{ Number: { value: 1 } }] } },
            index: { Number: { value: 0 } },
          }),
        ),
        numberPart(
          await coreCall("list-get", {
            list: { ListLiteral: { items: [{ String: { value: "a" } }] } },
            index: { Number: { value: 0 } },
          }),
        ),
      ],
      env,
    });
    expect(outcomes.map((outcome) => outcome.kind)).toEqual([
      "type_error",
      "type_error",
      "ok",
      "type_error",
    ]);
    expect(outcomes[0]).toMatchObject({ tag: "invalid_type_declaration" });
    expect(outcomes[1]).toMatchObject({ tag: "invalid_type_declaration" });
  }, 600_000);

  it("関数は値として書けない (関数の引数にはラムダ式を書く)", async () => {
    const { typeChecker, env } = compileSeedTypeChecker(await loadSeedParts());
    const mapperType = {
      function: {
        parameters: [
          {
            name: "f",
            type: {
              function: {
                parameters: [{ name: "item", type: "number" }],
                return_type: "number",
              },
            },
          },
        ],
        return_type: { list: "number" },
      },
    };
    const mapWith = async (f: unknown): Promise<PartToCheck> => ({
      partType: mapperType,
      expression: {
        Function: {
          parameters: [{ parameter_id: 0, parameter_name: "f" }],
          body: await coreCall("list-map", {
            f,
            xs: { ListLiteral: { items: [{ Number: { value: 1 } }] } },
          }),
        },
      },
    });
    const plusReference = (
      (await coreCall("plus", {})) as {
        readonly Call: { readonly function: unknown };
      }
    ).Call.function;
    const outcomes = checkParts({
      typeChecker,
      parts: [
        // 関数型の引数をそのまま渡す
        await mapWith({ Variable: { variable_id: 0 } }),
        // ラムダ式で包んで渡す
        await mapWith({
          Function: {
            parameters: [{ parameter_id: 1, parameter_name: "item" }],
            body: {
              Call: {
                function: { Variable: { variable_id: 0 } },
                arguments: [
                  { name: "item", value: { Variable: { variable_id: 1 } } },
                ],
              },
            },
          },
        }),
        // 関数のパーツを呼ばずに値にする
        {
          partType: "number",
          expression: {
            Let: {
              bindings: [
                { variable_id: 0, variable_name: "g", value: plusReference },
              ],
              body: { Number: { value: 1 } },
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
      expression: expressionToSelfHostedValue({ Variable: { variable_id: 0 } }),
    });
    expect(outcomes[2]).toMatchObject({ tag: "function_not_called" });
  }, 600_000);

  it("quote 式の型は Code<中の式の型> で, 中の式は外の変数を使えない", async () => {
    const parts = await loadSeedParts();
    const { typeChecker, env } = compileSeedTypeChecker(parts);
    const coreExpressionId = parts.find(
      (part) => part.name === "core.expression",
    )?.id;
    const quote = (expression: unknown): unknown => ({
      Quote: { expression },
    });
    const incrementType = {
      function: {
        parameters: [{ name: "n", type: "number" }],
        return_type: "number",
      },
    };
    const increment = {
      Function: {
        parameters: [{ parameter_id: 0, parameter_name: "n" }],
        body: await coreCall("plus", {
          left: { Variable: { variable_id: 0 } },
          right: { Number: { value: 1 } },
        }),
      },
    };
    const outcomes = checkParts({
      typeChecker,
      parts: [
        {
          partType: { code: "number" },
          expression: quote({ Number: { value: 1 } }),
        },
        {
          partType: { code: "number" },
          expression: quote({ String: { value: "x" } }),
        },
        { partType: { code: incrementType }, expression: quote(increment) },
        // Code<T> の値は core.code のレコードなので expression を取り出せる
        // (ラムダ式は期待する型が無いと推論できないので, ここでは数の式)
        {
          partType: { type_part: coreExpressionId },
          expression: {
            RecordGet: {
              record: quote({ Number: { value: 1 } }),
              key: "expression",
            },
          },
        },
        // quote の中から外の変数は使えない
        {
          partType: {
            function: {
              parameters: [{ name: "x", type: "number" }],
              return_type: { code: "number" },
            },
          },
          expression: {
            Function: {
              parameters: [{ parameter_id: 0, parameter_name: "x" }],
              body: quote({ Variable: { variable_id: 0 } }),
            },
          },
        },
        // 期待する型が無い位置 (let) でも推論できる
        {
          partType: { code: "string" },
          expression: {
            Let: {
              bindings: [
                {
                  variable_id: 0,
                  variable_name: "c",
                  value: quote({ String: { value: "x" } }),
                },
              ],
              body: { Variable: { variable_id: 0 } },
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
    expect(
      formatTypeAst({ tag: "code", payload: { tag: "number", payload: null } }),
    ).toBe("Code<number>");
  }, 600_000);

  it("未入力 (probe) の位置で期待する型を返す", async () => {
    const parts = await loadSeedParts();
    const { typeChecker, env } = compileSeedTypeChecker(parts);
    const session = createTypeCheckSession({ typeChecker, env });
    const stdAbs = parts.find((part) => part.name === "std.abs");
    const numberFunction = {
      function: {
        parameters: [{ name: "n", type: "number" }],
        return_type: "number",
      },
    };
    const inBody = (body: unknown): unknown => ({
      Function: {
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
            await coreCall("plus", { left: { Hole: {} }, right: { Hole: {} } }),
          ),
          ["functionBody", { kind: "callArgument", index: 1 }],
        ),
      ),
    ).toBe("number");
    // パーツの呼び出しの引数は呼び出し先の引数の型
    expect(
      expectedAt(
        inBody({
          Call: {
            function: {
              PartReference: { part_definition_event_hash: stdAbs?.id },
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
          right: { Hole: {} },
        }),
        "string",
      ),
    ).toBe("string");
    // 関数の本体はパーツの型の戻り値の型
    expect(
      expectedAt(probeExpressionAt(inBody({ Hole: {} }), ["functionBody"])),
    ).toBe("number");
    // 推論する位置 (== の左辺) では分からない
    expect(
      session.findExpectedType({
        expression: await coreCall("equal", {
          left: EXPECTED_TYPE_PROBE,
          right: { Number: { value: 1 } },
        }),
        partType: "boolean",
      }),
    ).toBeNull();
  }, 600_000);

  it("式を [式, probe] にしてその式の型を聞く (ホバーの表示)", async () => {
    const parts = await loadSeedParts();
    const { typeChecker, env } = compileSeedTypeChecker(parts);
    const session = createTypeCheckSession({ typeChecker, env });
    const stdAbs = parts.find((part) => part.name === "std.abs");
    const partType = {
      function: {
        parameters: [{ name: "n", type: "number" }],
        return_type: "number",
      },
    };
    const absReference = {
      PartReference: { part_definition_event_hash: stdAbs?.id },
    };
    const expression = {
      Function: {
        parameters: [{ parameter_id: 0, parameter_name: "n" }],
        body: await coreCall("plus", {
          left: {
            Call: {
              function: absReference,
              arguments: [
                { name: "x", value: { Variable: { variable_id: 0 } } },
              ],
            },
          },
          right: { Number: { value: 1 } },
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
      Function: { ...expression.Function, body: { Hole: {} } },
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
      tag: "reference",
      payload: { part_hash: optionNumber?.id },
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
      Variant: { tag, payload, type_part_definition_event_hash: typePart },
    });
    // 型パーツを指定しない Variant は, そのタグだけの直和型 (== の左辺は推論する位置)
    expect(
      session.findExpectedType({
        expression: await coreCall("equal", {
          left: {
            ListLiteral: {
              items: [
                variant("some", { Number: { value: 1 } }, null),
                EXPECTED_TYPE_PROBE,
              ],
            },
          },
          right: { Hole: {} },
        }),
        partType: "boolean",
      }),
    ).toMatchObject({ tag: "union", payload: [{ tag: "some" }] });
    // 型パーツにないタグや合わない値は型エラー
    const checkVariant = (expression: unknown) =>
      checkParts({
        typeChecker,
        parts: [{ expression, partType: { type_part: optionNumber?.id } }],
        env,
      })[0]?.kind;
    expect(
      checkVariant(variant("some", { Number: { value: 1 } }, optionNumber?.id)),
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
            partType: "boolean",
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
              left: variant(
                "some",
                { String: { value: "x" } },
                optionNumber?.id,
              ),
              right: variant("none", null, optionNumber?.id),
            }),
            partType: "boolean",
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
          Function: {
            parameters: [{ parameter_id: 0, parameter_name: "e" }],
            body: {
              Match: {
                target: { Variable: { variable_id: 0 } },
                arms: [
                  {
                    tag: "number",
                    variable_id: 1,
                    variable_name: "n",
                    body: { Variable: { variable_id: 1 } },
                  },
                ],
                default: { Number: { value: 0 } },
              },
            },
          },
        },
        ["functionBody", { kind: "matchArmPattern", index: 0 }],
      ),
      partType: {
        function: {
          parameters: [{ name: "e", type: { type_part: expressionPart?.id } }],
          return_type: "number",
        },
      },
    });
    const variants = toVariants(type);
    expect(variants).toContainEqual({ tag: "number", hasPayload: true });
    expect(variants).toContainEqual({ tag: "type_number", hasPayload: false });
  }, 600_000);

  it("型エラーの型を読める形にする", () => {
    const number = { tag: "number", payload: null };
    const listOfUser = {
      tag: "list",
      payload: {
        item_type: { tag: "reference", payload: { part_hash: "user-id" } },
      },
    };
    expect(
      formatTypeAst(listOfUser, (id) =>
        id === "user-id" ? "app.user" : undefined,
      ),
    ).toBe("List<app.user>");
    expect(
      formatTypeAst({
        tag: "function",
        payload: {
          parameters: [{ name: "n", type: number }],
          return_type: {
            tag: "union",
            payload: [
              { tag: "none", payload_type: { tag: "none", payload: null } },
              { tag: "some", payload_type: { tag: "some", payload: number } },
            ],
          },
        },
      }),
    ).toBe("(n: number) -> none | some(number)");
    expect(
      outcomeErrorMessage("bad", {
        kind: "type_error",
        tag: "type_mismatch",
        detail: { expected: number, actual: { tag: "string", payload: null } },
        expression: null,
      }),
    ).toBe(
      "part 'bad': type error: type_mismatch (expected: number, actual: string)",
    );
  });
});
