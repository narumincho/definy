import { describe, expect, it } from "vitest";
import { definitionRowsOf, nextRow } from "./definition_rows.ts";

describe("nextRow", () => {
  it("行の間を上下に移動し, Q で見出しへ戻る", () => {
    expect(nextRow(null, "down")).toBe("name");
    expect(nextRow("name", "down")).toBe("module");
    expect(nextRow("type", "up")).toBe("description");
    expect(nextRow("value", "down")).toBeNull();
    expect(nextRow("name", "up")).toBeNull();
    expect(nextRow("value", "parent")).toBe("name");
    expect(nextRow("name", "parent")).toBeNull();
  });

  it("見出しから E で先頭 / 末尾の行へ入る", () => {
    expect(nextRow("name", "firstChild")).toBe("module");
    expect(nextRow("name", "lastChild")).toBe("value");
    expect(nextRow("module", "firstChild")).toBeNull();
  });
});

describe("nextRow (定義の式の表示)", () => {
  it("module の下は definition", () => {
    const rows = definitionRowsOf("definition");
    expect(nextRow("module", "down", rows)).toBe("definition");
    expect(nextRow("definition", "down", rows)).toBeNull();
    expect(nextRow("name", "lastChild", rows)).toBe("definition");
    // 項目ごとの表示で選んでいた行は見出しに戻す
    expect(nextRow("type", "down", rows)).toBe("name");
  });
});
