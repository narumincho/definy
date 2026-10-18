import { describe, expect, it } from "vitest";
import { applySelection } from "./mutation.ts";
import { getOptionValueForExpression } from "./type_inference.ts";
import { bytesToUrlSafeBase64NoPad } from "../cbor.ts";

describe("tree layout mutation and selection", () => {
  it("applies part reference selection with 32-byte Uint8Array hash and resolves option value", () => {
    const rawBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      rawBytes[i] = (i * 7 + 11) & 0xff;
    }
    const b64 = bytesToUrlSafeBase64NoPad(rawBytes);
    const selectionValue = `ref:part:${b64}`;

    const holeExpr = { Hole: {} };
    const updated = applySelection(holeExpr, [], selectionValue);

    expect(updated).not.toBeNull();
    const partRefNode = updated as {
      readonly PartReference?: {
        readonly part_definition_event_hash?: unknown;
      };
    };
    expect(partRefNode.PartReference).toBeDefined();

    const hash = partRefNode.PartReference?.part_definition_event_hash;
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash).toEqual(rawBytes);
    expect((hash as Uint8Array).length).toBe(32);

    const resolvedOptionValue = getOptionValueForExpression(updated);
    expect(resolvedOptionValue).toBe(selectionValue);
  });
});
