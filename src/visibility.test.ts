import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  checkReferenceVisibility,
  visibilityViolationMessage,
  type VisibilityCheckedPart,
  type VisibilityTarget,
} from "./visibility.ts";

const checker = new WebAssembly.Module(
  await readFile("wasm/visibility_checker.wasm"),
);

const reference = (id: string): unknown => ({
  "#part_reference": { part_definition_event_hash: id },
});

function committed(
  moduleName: string,
  name: string,
  expression: unknown,
  overrides: Partial<VisibilityCheckedPart> = {},
): VisibilityCheckedPart {
  return {
    partId: `${moduleName}.${name}`,
    name: `${moduleName}.${name}`,
    moduleName,
    visibility: "public",
    moduleVisibility: "public",
    partType: { "#type_number": null },
    expression,
    ...overrides,
  };
}

function target(
  projectName: string,
  moduleName: string,
  name: string,
  overrides: Partial<VisibilityTarget> = {},
): [string, VisibilityTarget] {
  return [
    `${moduleName}.${name}`,
    {
      name: `${moduleName}.${name}`,
      moduleName,
      projectName,
      visibility: "public",
      moduleVisibility: "public",
      ...overrides,
    },
  ];
}

describe("checkReferenceVisibility", () => {
  const environment = new Map([
    target("lib", "lib", "open"),
    target("lib", "lib", "secret", { visibility: "private" }),
    target("lib", "internal", "helper", { moduleVisibility: "private" }),
  ]);

  it("他のプロジェクトの公開のパーツは参照できる", () => {
    expect(
      checkReferenceVisibility(checker, {
        projectName: "app",
        committed: [committed("app", "main", reference("lib.open"))],
        environment,
      }),
    ).toEqual([]);
  });

  it("非公開のパーツと, 他のプロジェクトの非公開のモジュールのパーツは参照できない", () => {
    const violations = checkReferenceVisibility(checker, {
      projectName: "app",
      committed: [
        committed("app", "a", reference("lib.secret")),
        committed("app", "b", reference("internal.helper")),
      ],
      environment,
    });
    expect(violations).toEqual([
      { partName: "app.a", targetName: "lib.secret", reason: "private_part" },
      {
        partName: "app.b",
        targetName: "internal.helper",
        reason: "private_module",
      },
    ]);
    expect(violations.map(visibilityViolationMessage)).toEqual([
      "part 'app.a': cannot reference the private part 'lib.secret'",
      "part 'app.b': cannot reference 'internal.helper' of a private module in another project",
    ]);
  });

  it("同じモジュールの非公開のパーツと, 同じプロジェクトの非公開のモジュールは参照できる", () => {
    expect(
      checkReferenceVisibility(checker, {
        projectName: "lib",
        committed: [
          committed(
            "lib",
            "secret",
            { "#number": 1 },
            { visibility: "private" },
          ),
          committed("lib", "uses", reference("lib.secret")),
          committed(
            "internal",
            "helper",
            { "#number": 2 },
            {
              moduleVisibility: "private",
            },
          ),
          committed("lib", "uses-helper", reference("internal.helper")),
        ],
        environment: new Map(),
      }),
    ).toEqual([]);
  });

  it("同じプロジェクトでも, 他のモジュールの非公開のパーツは参照できない. コミットのパーツを優先する", () => {
    expect(
      checkReferenceVisibility(checker, {
        projectName: "lib",
        committed: [
          committed("lib", "open", { "#number": 1 }, { visibility: "private" }),
          committed("other", "uses", reference("lib.open")),
        ],
        environment,
      }),
    ).toEqual([
      {
        partName: "other.uses",
        targetName: "lib.open",
        reason: "private_part",
      },
    ]);
  });
  it("型・型パーツの宣言・quote の中の参照も見る. 同じパーツへの参照は 1 度だけ", () => {
    expect(
      checkReferenceVisibility(checker, {
        projectName: "app",
        committed: [
          committed(
            "app",
            "typed",
            {
              "#call": {
                function: reference("lib.secret"),
                arguments: [{ name: "x", value: reference("lib.secret") }],
              },
            },
            {
              partType: {
                "#type_function": {
                  parameters: [
                    {
                      name: "x",
                      type: {
                        "#part_reference": {
                          part_definition_event_hash: "internal.helper",
                        },
                      },
                    },
                  ],
                  return_type: { "#type_number": null },
                },
              },
            },
          ),
          committed(
            "app",
            "declared",
            {
              "#type_record": [
                {
                  key: "a",
                  value: {
                    "#type_list": { item_type: reference("lib.secret") },
                  },
                },
              ],
            },
            { partType: { "#type_type": null } },
          ),
          committed("app", "quoted", {
            "#quote": reference("internal.helper"),
          }),
          committed("app", "untyped", null, { partType: null }),
        ],
        environment,
      }),
    ).toEqual([
      {
        partName: "app.typed",
        targetName: "internal.helper",
        reason: "private_module",
      },
      {
        partName: "app.typed",
        targetName: "lib.secret",
        reason: "private_part",
      },
      {
        partName: "app.declared",
        targetName: "lib.secret",
        reason: "private_part",
      },
      {
        partName: "app.quoted",
        targetName: "internal.helper",
        reason: "private_module",
      },
    ]);
  });
});
