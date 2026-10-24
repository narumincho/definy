import { describe, expect, it } from "vitest";
import { bytesToUrlSafeBase64NoPad } from "../cbor.ts";
import type { PartSnapshot } from "../types.ts";
import { applySelection } from "./selection.ts";
import { getOptionValueForExpression } from "./type_inference.ts";
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
    partType: "type",
    contentHash: null,
    partIdHash,
    expression: { TypeUnion: { variants } },
    updatedAtMs: 0,
  } as PartSnapshot;
}

const parts = [
  typePart("color", colorHash, [{ tag: "red" }, { tag: "blue" }]),
  typePart("option-number", optionHash, [
    { tag: "none" },
    { tag: "some", payload_type: "TypeNumber" },
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
    const created = applySelection({ Hole: {} }, [], someValue) as {
      Variant: {
        tag: string;
        payload: unknown;
        type_part_definition_event_hash: Uint8Array;
      };
    };
    expect(created.Variant.tag).toBe("some");
    expect(created.Variant.payload).toEqual({ Hole: {} });
    expect(
      bytesToUrlSafeBase64NoPad(
        created.Variant.type_part_definition_event_hash,
      ),
    ).toBe(optionHash);
    // 作った式の現在の選択肢は, 選んだ選択肢
    expect(getOptionValueForExpression(created)).toBe(someValue);
  });

  it("値を持つタグ同士で変えると値を引き継ぎ, 値を持たないタグにすると値を消す", () => {
    const some = applySelection({ Hole: {} }, [], someValue);
    const filled = {
      Variant: {
        ...(some as { Variant: object }).Variant,
        payload: { Number: { value: 3 } },
      },
    };
    const none = applySelection(filled, [], noneValue) as {
      Variant: { tag: string; payload: unknown };
    };
    expect(none.Variant).toMatchObject({ tag: "none", payload: null });
    const again = applySelection(filled, [], someValue) as {
      Variant: { payload: unknown };
    };
    expect(again.Variant.payload).toEqual({ Number: { value: 3 } });
  });

  it("期待する型が型パーツでない直和型なら, そのタグを型パーツなしで作る", () => {
    const expected = expectedVariantsFromTypeAst({
      tag: "union",
      payload: [
        {
          tag: "ok",
          payload_type: { tag: "some", payload: { tag: "number" } },
        },
        { tag: "error", payload_type: { tag: "none" } },
      ],
    } as never);
    expect(expected.typePartIdHash).toBeNull();
    const options = unionVariantOptions(expected.unionVariants);
    expect(options.map((o) => o.name)).toEqual(["ok", "error"]);
    expect(applySelection({ Hole: {} }, [], options[0]?.value ?? "")).toEqual({
      Variant: {
        tag: "ok",
        payload: { Hole: {} },
        type_part_definition_event_hash: null,
      },
    });
  });

  it("期待する型が型パーツなら, その ID", () => {
    expect(
      expectedVariantsFromTypeAst({
        tag: "reference",
        payload: { part_hash: optionHash },
      } as never).typePartIdHash,
    ).toBe(optionHash);
  });
});
