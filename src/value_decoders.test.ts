import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  valueDecoderParts,
  withValueDecoders,
} from "../scripts/generate_value_decoders.ts";
import { compileSeedFunction } from "./event_check.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import { loadSeedPartExpressions } from "./seed_parts.ts";
import {
  createStage1Compiler,
  instantiateCompiledFunction,
} from "./stage1_compiler.ts";

const coreSeedText = readFileSync("seeds/core.json", "utf8");
const coreSeed = JSON.parse(coreSeedText) as Parameters<
  typeof withValueDecoders
>[0];

const seedExpressions = await loadSeedPartExpressions();
const compiler = createStage1Compiler(
  new WebAssembly.Module(readFileSync("wasm/stage1.wasm")),
);

/** seed の `core.<partName>` をコンパイルして, 引数 `value` で呼ぶ */
function callCoreDecoder(partName: string, value: unknown): unknown {
  const instance = instantiateCompiledFunction(
    new WebAssembly.Module(
      new Uint8Array(
        compileSeedFunction({
          compiler,
          partId: deriveModulePartId(deriveModuleIdBytes("core"), partName),
          resolvePart: (id) => seedExpressions.get(id),
        }),
      ),
    ),
  );
  return instance.read(instance.call({ value: instance.writeArgument(value) }));
}

/** seed の JSON の形の値を, 評価器が返す形 (`core.value`) にする (src/definition_evaluator.ts の coreValueToValue の逆) */
function toCoreValue(value: unknown): unknown {
  if (typeof value === "number") return { "#number": value };
  if (typeof value === "string") return { "#string": value };
  if (typeof value === "boolean") return { "#boolean": value };
  if (Array.isArray(value)) return { "#list": value.map(toCoreValue) };
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 1 && entries[0]![0].startsWith("#")) {
      const [tag, payload] = entries[0]!;
      return {
        "#variant": {
          tag: tag.slice(1),
          payload: payload === null ? { "#unit": null } : toCoreValue(payload),
        },
      };
    }
    return {
      "#record": entries.map(([key, item]) => ({
        key,
        value: toCoreValue(item),
      })),
    };
  }
  throw new Error(`unexpected value: ${JSON.stringify(value)}`);
}

describe("core.value-to-*", () => {
  it("seeds/core.json は scripts/generate_value_decoders.ts の出力と同じ", () => {
    expect(JSON.stringify(withValueDecoders(coreSeed), null, 2)).toBe(
      coreSeedText,
    );
    expect(valueDecoderParts(coreSeed.parts).map((part) => part.name)).toEqual([
      "value-decoded",
      "value-to-list",
      "value-to-part-content",
      "value-to-localized-text",
      "value-to-visibility",
      "value-to-expression",
      "value-to-callee",
      "value-to-match-arm",
      "value-to-pattern",
    ]);
  });

  it("core.value-to-expression は seed の definy の全パーツの式を読める", () => {
    const definy = JSON.parse(readFileSync("seeds/definy.json", "utf8")) as {
      readonly parts: ReadonlyArray<{
        readonly name: string;
        readonly expression?: unknown;
      }>;
    };
    // seed の `{"$part": ...}` はパーツ ID の文字列にする
    for (const part of definy.parts) {
      const expression = seedExpressions.get(
        deriveModulePartId(deriveModuleIdBytes("definy"), part.name),
      );
      if (expression == null) continue;
      expect(
        callCoreDecoder("value-to-expression", toCoreValue(expression)),
        part.name,
      ).toEqual({ "#some": expression });
    }
  });

  it("core.value-to-part-content はパーツの中身を読み, 形が違えば none", () => {
    const content = {
      description: [{ language: "en", text: "A number" }],
      visibility: { "#public": null },
      part_type: { "#some": { "#type_number": null } },
      expression: { "#some": { "#number": 1 } },
    };
    expect(
      callCoreDecoder("value-to-part-content", toCoreValue(content)),
    ).toEqual({ "#some": content });
    expect(
      callCoreDecoder(
        "value-to-part-content",
        toCoreValue({ ...content, visibility: { "#protected": null } }),
      ),
    ).toEqual({ "#none": null });
    expect(
      callCoreDecoder(
        "value-to-part-content",
        toCoreValue({
          ...content,
          expression: { "#some": { "#number": "1" } },
        }),
      ),
    ).toEqual({ "#none": null });
    expect(callCoreDecoder("value-to-part-content", { "#number": 1 })).toEqual({
      "#none": null,
    });
  });
});
