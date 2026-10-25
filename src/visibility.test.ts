import { describe, expect, it } from "vitest";
import {
  checkReferenceVisibility,
  referencedPartIds,
  visibilityViolationMessage,
  type VisibilityCheckedPart,
  type VisibilityTarget,
} from "./visibility.ts";

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
    partType: { "#number": null },
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

describe("referencedPartIds", () => {
  it("式と型の中のパーツ参照を集める", () => {
    expect([
      ...referencedPartIds({
        "#call": {
          function: reference("a"),
          arguments: [{ name: "x", value: reference("b") }],
        },
      }),
    ]).toEqual(["a", "b"]);
  });
});

describe("checkReferenceVisibility", () => {
  const environment = new Map([
    target("lib", "lib", "open"),
    target("lib", "lib", "secret", { visibility: "private" }),
    target("lib", "internal", "helper", { moduleVisibility: "private" }),
  ]);

  it("他のプロジェクトの公開のパーツは参照できる", () => {
    expect(
      checkReferenceVisibility({
        projectName: "app",
        committed: [committed("app", "main", reference("lib.open"))],
        environment,
      }),
    ).toEqual([]);
  });

  it("非公開のパーツと, 他のプロジェクトの非公開のモジュールのパーツは参照できない", () => {
    const violations = checkReferenceVisibility({
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
      checkReferenceVisibility({
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
      checkReferenceVisibility({
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
});
