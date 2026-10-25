import { describe, expect, it } from "vitest";
import {
  newPartChange,
  overlayWorkingChanges,
  parseParameterNames,
  partsReferencing,
  validateNewPart,
  withNewParts,
} from "./new_part.ts";
import type { ModulePartSnapshot, PartChange, PartSnapshot } from "./types.ts";

function committedPart(
  moduleName: string,
  name: string,
  expression: unknown = { "#number": 1 },
): PartSnapshot {
  return {
    partId: `${moduleName}.${name}`,
    moduleId: moduleName,
    moduleName,
    name,
    description: [],
    visibility: "public",
    partType: { "#number": null },
    contentHash: null,
    partIdHash: `id-${moduleName}.${name}`,
    expression,
    updatedAtMs: 0,
  };
}

function change(name: string, fields: Partial<PartChange> = {}): PartChange {
  return {
    moduleDefinitionEventHash: "app",
    partDefinitionEventHash: `app.${name}`,
    name,
    description: [],
    partType: { "#number": null },
    expression: { "#number": 2 },
    ...fields,
  };
}

describe("validateNewPart", () => {
  const parts = [committedPart("app", "one")];
  const input = {
    moduleName: "app",
    name: "two",
    kind: "value" as const,
    parameterNames: [],
  };

  it("モジュール名・パーツ名が空でなく, . や空白が無く, 重ならなければ作れる", () => {
    const none = { parts: new Map() };
    expect(validateNewPart(input, parts, none)).toBeNull();
    expect(validateNewPart({ ...input, moduleName: " " }, parts, none)).toBe(
      "empty_module_name",
    );
    expect(validateNewPart({ ...input, moduleName: "a.b" }, parts, none)).toBe(
      "invalid_module_name",
    );
    expect(validateNewPart({ ...input, name: "" }, parts, none)).toBe(
      "empty_part_name",
    );
    expect(validateNewPart({ ...input, name: "a b" }, parts, none)).toBe(
      "invalid_part_name",
    );
    expect(validateNewPart({ ...input, name: "one" }, parts, none)).toBe(
      "duplicate_part_name",
    );
    expect(
      validateNewPart(
        { ...input, kind: "function", parameterNames: ["x", "x"] },
        parts,
        none,
      ),
    ).toBe("duplicate_parameter_name");
  });

  it("作業中の変更の名前 (新しいパーツ・名前の変更) とも重ねない. 削除したパーツの名前は使える", () => {
    const changes = {
      parts: new Map([
        ["app.new", change("two")],
        ["app.one", change("one", { deleted: true })],
      ]),
    };
    expect(validateNewPart(input, parts, changes)).toBe("duplicate_part_name");
    expect(validateNewPart({ ...input, name: "one" }, parts, changes)).toBe(
      null,
    );
  });
});

describe("newPartChange", () => {
  it("関数は引数付きのラムダ式と, 数値の引数・戻り値の型で始める", () => {
    expect(
      newPartChange({
        moduleName: " app ",
        name: "add",
        kind: "function",
        parameterNames: parseParameterNames("x, y"),
      }),
    ).toEqual({
      moduleDefinitionEventHash: "app",
      partDefinitionEventHash: "app.add",
      name: "add",
      description: [],
      partType: {
        "#function": {
          parameters: [
            { name: "x", type: { "#number": null } },
            { name: "y", type: { "#number": null } },
          ],
          return_type: { "#number": null },
        },
      },
      expression: {
        "#function": {
          parameters: [
            { parameter_id: 0, parameter_name: "x" },
            { parameter_id: 1, parameter_name: "y" },
          ],
          body: { "#hole": { probe: false } },
        },
      },
    });
  });

  it("値は型無し, 型パーツは #type で, 式は未入力", () => {
    const base = { moduleName: "app", name: "v", parameterNames: [] };
    expect(newPartChange({ ...base, kind: "value" })).toMatchObject({
      partType: null,
      expression: { "#hole": { probe: false } },
    });
    expect(newPartChange({ ...base, kind: "type" })).toMatchObject({
      partType: { "#type": null },
    });
  });
});

describe("overlayWorkingChanges", () => {
  const moduleParts: ReadonlyArray<ModulePartSnapshot> = [
    committedPart("app", "one"),
    committedPart("app", "keep"),
    committedPart("app", "gone"),
  ];

  it("名前を変えたパーツは元の名前を外し, 削除したパーツは外し, 他のモジュールの変更は入れない", () => {
    const { partsList, committedPartIds } = overlayWorkingChanges(
      "app",
      moduleParts,
      {
        parts: new Map([
          ["app.one", change("renamed")],
          ["app.gone", change("gone", { deleted: true })],
          ["app.fresh", change("fresh")],
          ["other.one", change("one")],
        ]),
      },
    );
    expect(partsList.map((p) => p.name)).toEqual(["keep", "renamed", "fresh"]);
    expect([...committedPartIds]).toEqual(["app.one", "app.gone", "app.fresh"]);
  });

  it("公開/非公開は変更が決めていなければコミット済みのまま, 新しいパーツは公開 (docs/visibility.md)", () => {
    const { partsList } = overlayWorkingChanges(
      "app",
      [
        { ...committedPart("app", "secret"), visibility: "private" },
        committedPart("app", "open"),
      ],
      {
        parts: new Map([
          ["app.secret", change("secret")],
          ["app.open", change("open", { visibility: "private" })],
          ["app.fresh", change("fresh")],
        ]),
      },
    );
    expect(partsList.map((p) => [p.name, p.visibility])).toEqual([
      ["secret", "private"],
      ["open", "private"],
      ["fresh", "public"],
    ]);
  });
});

describe("partsReferencing", () => {
  it("式・型でパーツを参照しているパーツ (作業中の変更を含む. 自分と削除したものは除く)", () => {
    const ref = { "#part_reference": { part_definition_event_hash: "target" } };
    const parts = [
      committedPart("app", "target", ref),
      committedPart("app", "caller", ref),
      committedPart("app", "unrelated"),
      committedPart("app", "removed", ref),
    ];
    expect(
      partsReferencing("target", "app.target", parts, {
        parts: new Map([
          ["app.removed", change("removed", { deleted: true })],
          ["app.fresh", change("fresh", { expression: ref })],
        ]),
      }),
    ).toEqual(["app.caller", "app.fresh"]);
  });
});

describe("withNewParts", () => {
  it("作業中の変更だけにあるパーツとモジュールを足す", () => {
    const { modules, parts } = withNewParts([], [committedPart("app", "one")], {
      parts: new Map([
        ["app.one", change("one")],
        ["fresh.part", change("part")],
      ]),
    });
    expect(modules.map((m) => m.name)).toEqual(["fresh"]);
    expect(parts.map((p) => p.partId)).toEqual(["app.one", "fresh.part"]);
    expect(parts[1]?.partIdHash).toEqual(expect.any(String));
  });
});
