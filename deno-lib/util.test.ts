import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.163.0/testing/asserts.ts";
import { removeFileProtocol, stringArrayMatchPrefix } from "./util.ts";

Deno.test("stringArrayMatchPrefix match", () => {
  assert(stringArrayMatchPrefix(["a", "b", "c"], ["a"]));
});

Deno.test("stringArrayMatchPrefix not match", () => {
  assertEquals(stringArrayMatchPrefix(["a", "b", "c"], ["k"]), false);
});

Deno.test("stringArrayMatchPrefix empty", () => {
  assert(stringArrayMatchPrefix(["a", "b", "c"], []));
});

Deno.test("removeFileProtocol windows", () => {
  assertEquals(
    removeFileProtocol("file:///C:/Users/narum/repo/definy/deno-lib/build.ts"),
    "C:/Users/narum/repo/definy/deno-lib/build.ts"
  );
});

Deno.test("removeFileProtocol linux", () => {
  // Linux でも動くようにしたいね
  assertEquals(
    removeFileProtocol("file:///C:/Users/narum/repo/definy/deno-lib/build.ts"),
    "C:/Users/narum/repo/definy/deno-lib/build.ts"
  );
});
