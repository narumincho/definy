import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.165.0/testing/asserts.ts";
import { listDeleteAt, listSetAt, stringArrayMatchPrefix } from "./util.ts";

Deno.test("stringArrayMatchPrefix match", () => {
  assert(stringArrayMatchPrefix(["a", "b", "c"], ["a"]));
});

Deno.test("stringArrayMatchPrefix not match", () => {
  assertEquals(stringArrayMatchPrefix(["a", "b", "c"], ["k"]), false);
});

Deno.test("stringArrayMatchPrefix empty", () => {
  assert(stringArrayMatchPrefix(["a", "b", "c"], []));
});

Deno.test("util listDeleteAt center", () => {
  assertEquals(listDeleteAt(["あ", "い", "う", "え", "お"], 1), [
    "あ",
    "う",
    "え",
    "お",
  ]);
});

Deno.test("util listDeleteAt first", () => {
  assertEquals(listDeleteAt(["あ", "い", "う", "え", "お"], 0), [
    "い",
    "う",
    "え",
    "お",
  ]);
});
Deno.test("util listDeleteAt last", () => {
  assertEquals(listDeleteAt(["あ", "い", "う", "え", "お"], 4), [
    "あ",
    "い",
    "う",
    "え",
  ]);
});
Deno.test("util listDeleteAt out of index", () => {
  assertEquals(listDeleteAt(["あ", "い", "う"], 3), ["あ", "い", "う"]);
});
Deno.test("util listSetAt center", () => {
  assertEquals(listSetAt(["あ", "い", "う"], 1, "それな"), [
    "あ",
    "それな",
    "う",
  ]);
});
Deno.test("util listSetAt first", () => {
  assertEquals(listSetAt(["あ", "い", "う"], 0, "それな"), [
    "それな",
    "い",
    "う",
  ]);
});
Deno.test("util listSetAt last", () => {
  assertEquals(listSetAt(["あ", "い", "う"], 2, "それな"), [
    "あ",
    "い",
    "それな",
  ]);
});
Deno.test("util listSetAt out of index", () => {
  assertEquals(listSetAt(["あ", "い", "う"], 3, "それな"), [
    "あ",
    "い",
    "う",
  ]);
});
