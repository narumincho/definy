import { describe, expect, it } from "vitest";
import { nextRow } from "./definition_rows.ts";

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
