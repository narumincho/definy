import { describe, expect, it } from "vitest";
import { bytesToUrlSafeBase64NoPad } from "../cbor.ts";
import type { PartSnapshot } from "../types.ts";
import { applySelection } from "./selection.ts";
import { getOptionValueForExpression } from "./type_inference.ts";
import { resolveCurrentOptionValue } from "./selector_options.ts";
import {
  expectedVariantsFromTypeAst,
  typePartVariantOptions,
  unionVariantOptions,
} from "./variant.ts";

const optionHash = bytesToUrlSafeBase64NoPad(new Uint8Array(32).fill(1));
const colorHash = bytesToUrlSafeBase64NoPad(new Uint8Array(32).fill(2));

function typePart(
  name: string,
  partIdHash: string,
  variants: ReadonlyArray<{ tag: string; payload_type?: unknown }>,
): PartSnapshot {
  return {
    partId: `sample.${name}`,
    moduleId: "sample",
    moduleName: "sample",
    name,
    description: {},
    partType: { "#type": null },
    contentHash: null,
    partIdHash,
    expression: {
      "#type_union": variants.map(({ tag, payload_type }) => ({
        tag,
        payload_type:
          payload_type === undefined
            ? { "#none": null }
            : { "#some": payload_type },
      })),
    },
    updatedAtMs: 0,
  } as PartSnapshot;
}

const parts = [
  typePart("color", colorHash, [{ tag: "red" }, { tag: "blue" }]),
  typePart("option-number", optionHash, [
    { tag: "none" },
    { tag: "some", payload_type: { "#type_number": null } },
  ]),
];

describe("typePartVariantOptions", () => {
  it("直和型の型パーツのタグを `module.part.tag` の名前で出す", () => {
    expect(
      typePartVariantOptions(parts).map((o) => [o.name, o.detail]),
    ).toEqual([
      ["sample.color.red", undefined],
      ["sample.color.blue", undefined],
      ["sample.option-number.none", undefined],
      ["sample.option-number.some", "(value)"],
    ]);
  });

  it("期待する型の型パーツのタグを先に出す", () => {
    expect(
      typePartVariantOptions(parts, optionHash).map((o) => o.name)[0],
    ).toBe("sample.option-number.none");
  });
});

describe("Variant の作成", () => {
  const someValue = typePartVariantOptions(parts).find(
    (o) => o.name === "sample.option-number.some",
  )?.value as string;
  const noneValue = typePartVariantOptions(parts).find(
    (o) => o.name === "sample.option-number.none",
  )?.value as string;

  it("値を持つタグは値を未入力にし, 型パーツを指定する", () => {
    const created = applySelection(
      { "#hole": { probe: false } },
      [],
      someValue,
    );
    expect(created).toEqual({
      "#variant": {
        tag: "some",
        payload: { "#some": { "#hole": { probe: false } } },
        type_part: { "#some": optionHash },
      },
    });
    // 作った式の現在の選択肢は, 選んだ選択肢
    expect(getOptionValueForExpression(created)).toBe(someValue);
  });

  it("値を持つタグ同士で変えると値を引き継ぎ, 値を持たないタグにすると値を消す", () => {
    const some = applySelection({ "#hole": { probe: false } }, [], someValue);
    const filled = {
      "#variant": {
        ...(some as { "#variant": object })["#variant"],
        payload: { "#some": { "#number": 3 } },
      },
    };
    const none = applySelection(filled, [], noneValue) as {
      "#variant": { tag: string; payload: unknown };
    };
    expect(none["#variant"]).toMatchObject({
      tag: "none",
      payload: { "#none": null },
    });
    const again = applySelection(filled, [], someValue) as {
      "#variant": { payload: unknown };
    };
    expect(again["#variant"].payload).toEqual({ "#some": { "#number": 3 } });
  });

  it("期待する型が型パーツでない直和型なら, そのタグを型パーツなしで作る", () => {
    const expected = expectedVariantsFromTypeAst({
      "#union": [
        { tag: "ok", payload_type: { "#some": { "#number": null } } },
        { tag: "error", payload_type: { "#none": null } },
      ],
    } as never);
    expect(expected.typePartIdHash).toBeNull();
    const options = unionVariantOptions(expected.unionVariants);
    expect(options.map((o) => o.name)).toEqual(["ok", "error"]);
    expect(
      applySelection(
        { "#hole": { probe: false } },
        [],
        options[0]?.value ?? "",
      ),
    ).toEqual({
      "#variant": {
        tag: "ok",
        payload: { "#some": { "#hole": { probe: false } } },
        type_part: { "#none": null },
      },
    });
  });

  it("期待する型が型パーツなら, その ID", () => {
    expect(
      expectedVariantsFromTypeAst({
        "#reference": { part_hash: optionHash },
      } as never).typePartIdHash,
    ).toBe(optionHash);
  });
});

describe("今の Variant の選択肢", () => {
  it("型パーツの ID が選択肢と違っても, 型パーツの名前とタグが同じ選択肢にする", () => {
    const otherHash = bytesToUrlSafeBase64NoPad(new Uint8Array(32).fill(9));
    const options = typePartVariantOptions(parts);
    expect(
      resolveCurrentOptionValue({
        expression: {
          "#variant": {
            tag: "none",
            payload: { "#none": null },
            type_part: { "#some": otherHash },
          },
        },
        path: [],
        options,
        mode: "expression",
        partNames: new Map([[otherHash, "sample.option-number"]]),
      }),
    ).toBe(options.find((o) => o.name === "sample.option-number.none")?.value);
  });
});
