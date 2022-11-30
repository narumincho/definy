import { assertEquals } from "https://deno.land/std@0.166.0/testing/asserts.ts";
import {
  namespaceFromAndToToTypeScriptModuleName,
  namespaceRelative,
} from "./namespace.ts";

Deno.test("namespaceRelative same", () => {
  assertEquals(namespaceRelative(["a", "b"], ["a", "b"]), {
    upCount: 0,
    path: [],
  });
});

Deno.test("namespaceRelative sub", () => {
  assertEquals(namespaceRelative(["a", "b"], ["a", "b", "c", "d"]), {
    upCount: 0,
    path: ["c", "d"],
  });
});

Deno.test("namespaceRelative up", () => {
  assertEquals(namespaceRelative(["a", "b", "c", "d"], ["a"]), {
    upCount: 3,
    path: [],
  });
});

Deno.test("namespaceRelative up and down", () => {
  assertEquals(namespaceRelative(["a", "b"], ["a", "z", "s"]), {
    upCount: 1,
    path: ["z", "s"],
  });
});

Deno.test("namespaceRelative up and down 2", () => {
  assertEquals(namespaceRelative(["a", "b", "c", "d"], ["a", "b", "pathA"]), {
    upCount: 2,
    path: ["pathA"],
  });
});

Deno.test("namespaceFromAndToToTypeScriptModuleName a to b", () => {
  assertEquals(
    namespaceFromAndToToTypeScriptModuleName({ type: "local", path: ["a"] }, {
      type: "local",
      path: ["b"],
    }),
    "./b.ts",
  );
});
