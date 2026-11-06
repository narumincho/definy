/**
 * 式の definy のテキスト (docs/expression-text.md) を書く `definy.expression-text` と
 * 読む `definy.parse-expression-text` のテスト
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileSeedFunction } from "./event_check.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import {
  loadSeedPartExpressions,
  resolvePartPlaceholders,
} from "./seed_parts.ts";
import {
  createStage1Compiler,
  instantiateCompiledFunction,
} from "./stage1_compiler.ts";

const seedExpressions = await loadSeedPartExpressions();
const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);

/** seed の `definy.<partName>` をコンパイルして, 名前付きの引数で呼べる関数にする */
function definyFunction(
  partName: string,
): (args: Readonly<Record<string, unknown>>) => unknown {
  const instance = instantiateCompiledFunction(
    new WebAssembly.Module(
      new Uint8Array(
        compileSeedFunction({
          compiler,
          partId: deriveModulePartId(deriveModuleIdBytes("definy"), partName),
          resolvePart: (id) => seedExpressions.get(id),
        }),
      ),
    ),
  );
  return (args) =>
    instance.read(
      instance.call(
        Object.fromEntries(
          Object.entries(args).map(([key, value]) => [
            key,
            instance.writeArgument(value),
          ]),
        ),
      ),
    );
}

type SeedPart = {
  readonly name: string;
  readonly part_type?: unknown;
  readonly expression?: unknown;
};

const seedParts: ReadonlyArray<{
  readonly name: string;
  readonly id: string;
  readonly part: SeedPart;
}> = readdirSync("seeds")
  .filter((file) => file.endsWith(".json") && !file.startsWith("seed_bundle"))
  .flatMap((file) => {
    const seed = JSON.parse(readFileSync(`seeds/${file}`, "utf8")) as {
      readonly module_name: string;
      readonly parts: ReadonlyArray<SeedPart>;
    };
    const moduleId = deriveModuleIdBytes(seed.module_name);
    return seed.parts.map((part) => ({
      name: `${seed.module_name}.${part.name}`,
      id: deriveModulePartId(moduleId, part.name),
      part,
    }));
  });
const names = seedParts.map(({ id, name }) => ({ id, name }));

const expressionText = definyFunction("expression-text");
const parseExpressionText = definyFunction("parse-expression-text");
const toText = (expression: unknown) =>
  expressionText({ expression, indent: "", names }) as string;

describe("definy.parse-expression-text", () => {
  it("seed の全パーツの型と式は, テキストにして読むと元に戻る", async () => {
    for (const { name, part } of seedParts) {
      for (const expression of [part.part_type, part.expression]) {
        if (expression == null) continue;
        const resolved = await resolvePartPlaceholders(expression);
        const text = toText(resolved);
        expect(parseExpressionText({ text }), `${name}\n${text}`).toEqual({
          "#ok": resolved,
        });
      }
    }
  }, 120_000);

  it("文字列のエスケープとコメントと空白", () => {
    expect(
      parseExpressionText({
        text: ' // comment\n  [ "a\\"\\\\\\n\\u3042\\ud83d\\ude00" , -12 ,float(5, -1)] ',
      }),
    ).toEqual({
      "#ok": {
        "#list": [
          { "#string": 'a"\\\nあ😀' },
          { "#number": -12 },
          { "#float": { mantissa: 5, exponent: -1 } },
        ],
      },
    });
  });

  it("パーツ名はパーツ ID にし, 名前の分からない ID は文字列で書く", () => {
    expect(
      parseExpressionText({ text: '@core.plus(left: 1, right: @"abc")' }),
    ).toEqual({
      "#ok": {
        "#call": {
          function: {
            "#part_reference": {
              part_definition_event_hash: deriveModulePartId(
                deriveModuleIdBytes("core"),
                "plus",
              ),
            },
          },
          arguments: [
            { name: "left", value: { "#number": 1 } },
            {
              name: "right",
              value: {
                "#part_reference": { part_definition_event_hash: "abc" },
              },
            },
          ],
        },
      },
    });
  });

  it("書き方の誤りはバイトの位置付きのエラー", () => {
    expect(parseExpressionText({ text: "fn(x) => $0" })).toEqual({
      "#error": "expected '$' and the variable id after the name at byte 4",
    });
    expect(parseExpressionText({ text: "[1, 2" })).toEqual({
      "#error": "expected ',' or the closing bracket at byte 5",
    });
    expect(parseExpressionText({ text: "1 2" })).toEqual({
      "#error": "unexpected text after the expression at byte 2",
    });
    expect(parseExpressionText({ text: '"abc' })).toEqual({
      "#error": "unterminated string at byte 4",
    });
    expect(parseExpressionText({ text: "unknown" })).toEqual({
      "#error": "unknown word 'unknown' at byte 7",
    });
  });
});
