import { expect, test } from "vitest";
import { sidebarViewOf } from "./sidebar_view.ts";

test("サイドバーの欄は今のページのパスで決まる", () => {
  expect(sidebarViewOf("/")).toBe("events");
  expect(sidebarViewOf("/event/abc")).toBeNull();
  expect(sidebarViewOf("/accounts")).toBe("accounts");
  expect(sidebarViewOf("/account/abc")).toBe("accounts");
  expect(sidebarViewOf("/settings")).toBe("settings");
  expect(sidebarViewOf("/about")).toBe("settings");
  for (const path of [
    "/modules",
    "/project/definy",
    "/module/core",
    "/part/core.plus",
    "/parts",
    "/history",
    "/new-part",
  ]) {
    expect(sidebarViewOf(path)).toBe("projects");
  }
});
