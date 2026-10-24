import { describe, expect, it } from "vitest";
import {
  SHORTCUT_GROUPS,
  formatKeyCombo,
  isShortcutListKey,
} from "./shortcuts.ts";

const noModifiers = {
  ctrlKey: false,
  metaKey: false,
  altKey: false,
} as const;

describe("shortcut list", () => {
  it("Cmd / Ctrl + / で開く", () => {
    expect(
      isShortcutListKey({
        ...noModifiers,
        key: "/",
        code: "Slash",
        metaKey: true,
      }),
    ).toBe(true);
    expect(
      isShortcutListKey({
        ...noModifiers,
        key: "/",
        code: "Slash",
        ctrlKey: true,
      }),
    ).toBe(true);
  });

  it("配列によって key が / でなくても Slash の位置のキーなら開く", () => {
    expect(
      isShortcutListKey({
        ...noModifiers,
        key: "-",
        code: "Slash",
        ctrlKey: true,
      }),
    ).toBe(true);
  });

  it("修飾キーなしや Alt 付きでは開かない", () => {
    expect(isShortcutListKey({ ...noModifiers, key: "/", code: "Slash" })).toBe(
      false,
    );
    expect(
      isShortcutListKey({
        ...noModifiers,
        key: "/",
        code: "Slash",
        ctrlKey: true,
        altKey: true,
      }),
    ).toBe(false);
  });

  it("Mod は Mac では ⌘, それ以外では Ctrl と表示する", () => {
    expect(formatKeyCombo(["Mod", "Shift", "Z"], true)).toEqual([
      "⌘",
      "⇧",
      "Z",
    ]);
    expect(formatKeyCombo(["Mod", "Shift", "Z"], false)).toEqual([
      "Ctrl",
      "Shift",
      "Z",
    ]);
  });

  it("一覧の ID は重複しない", () => {
    const ids = SHORTCUT_GROUPS.flatMap((g) => g.shortcuts.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("shortcut-list");
  });
});
