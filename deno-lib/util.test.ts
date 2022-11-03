import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.161.0/testing/asserts.ts";
import { stringArrayMatchPrefix } from "./util.ts";

Deno.test("stringArrayMatchPrefix match", () => {
  assert(stringArrayMatchPrefix(["a", "b", "c"], ["a"]));
});

Deno.test("stringArrayMatchPrefix not match", () => {
  assertEquals(stringArrayMatchPrefix(["a", "b", "c"], ["k"]), false);
});

Deno.test("stringArrayMatchPrefix empty", () => {
  assert(stringArrayMatchPrefix(["a", "b", "c"], []));
});