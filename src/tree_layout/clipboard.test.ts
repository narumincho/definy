import { describe, expect, it } from "vitest";
import {
  expressionToClipboardText,
  parseClipboardText,
  pasteExpressionAt,
} from "./clipboard.ts";

const partHash = "AQID-g";

describe("expression clipboard", () => {
  it("round-trips an expression with part ids through JSON text", () => {
    const expr = {
      "#call": {
        function: {
          "#part_reference": { part_definition_event_hash: partHash },
        },
        arguments: [{ name: "a", value: { "#number": 1 } }],
      },
    };
    const text = expressionToClipboardText(expr, [], new Map(), "expression");
    expect(text).not.toBeNull();
    const data = parseClipboardText(text ?? "");
    expect(data?.expression).toEqual(expr);
  });

  it("ignores text that is not a definy expression", () => {
    expect(parseClipboardText("hello")).toBeNull();
    expect(parseClipboardText('{"a": 1}')).toBeNull();
  });

  it("does not paste a type into an expression", () => {
    const text = expressionToClipboardText(
      { "#type_number": null },
      [],
      undefined,
      "type",
    );
    const data = parseClipboardText(text ?? "");
    expect(data).not.toBeNull();
    if (data === null) return;
    expect(
      pasteExpressionAt(
        { "#hole": { probe: false } },
        [],
        data,
        undefined,
        "expression",
      ),
    ).toBeNull();
  });

  it("renumbers bound variables and maps free variables by name", () => {
    // let y = x in y  (x は外側の変数 ID 0)
    const copied = {
      "#let": {
        variable_id: 5,
        variable_name: "y",
        value: { "#variable": { variable_id: 0 } },
        body: { "#variable": { variable_id: 5 } },
      },
    };
    const text = expressionToClipboardText(
      copied,
      [],
      new Map([[0, "x"]]),
      "expression",
    );
    const data = parseClipboardText(text ?? "");
    expect(data?.freeVariables).toEqual([{ id: 0, name: "x" }]);
    if (data === null) return;

    // 貼り付け先: (x) => □  で x は ID 7
    const target = {
      "#function": {
        parameters: [{ parameter_id: 7, parameter_name: "x" }],
        body: { "#hole": { probe: false } },
      },
    };
    const result = pasteExpressionAt(
      target,
      ["functionBody"],
      data,
      new Map([[7, "x"]]),
      "expression",
    );
    expect(result).toEqual({
      "#function": {
        parameters: [{ parameter_id: 7, parameter_name: "x" }],
        body: {
          "#let": {
            variable_id: 8,
            variable_name: "y",
            value: { "#variable": { variable_id: 7 } },
            body: { "#variable": { variable_id: 8 } },
          },
        },
      },
    });
  });

  it("replaces free variables missing at the paste position with holes", () => {
    const copied = {
      "#list": [
        { "#variable": { variable_id: 3 } },
        {
          "#call": {
            function: { "#variable": { variable_id: 4 } },
            arguments: [],
          },
        },
      ],
    };
    const text = expressionToClipboardText(
      copied,
      [],
      new Map([
        [3, "a"],
        [4, "f"],
      ]),
      "expression",
    );
    const data = parseClipboardText(text ?? "");
    if (data === null) throw new Error("not parsed");
    expect(
      pasteExpressionAt(
        { "#hole": { probe: false } },
        [],
        data,
        new Map(),
        "expression",
      ),
    ).toEqual({
      "#list": [{ "#hole": { probe: false } }, { "#hole": { probe: false } }],
    });
  });
});
