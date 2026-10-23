import { describe, expect, it } from "vitest";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import {
  PATTERN_ADD_ARM,
  PATTERN_ADD_MISSING_ARMS,
  PATTERN_BIND,
  PATTERN_DELETE_ARM,
  PATTERN_UNBIND,
  PATTERN_ADD_DEFAULT,
  PATTERN_DEFAULT,
  PATTERN_DELETE_DEFAULT,
  applyPatternSelection,
  currentPatternOptionValue,
  patternSelectorOptions,
  patternVariantsFromTypeAst,
  probeMatchTargetType,
  renameMatchArmVariable,
  type PatternVariant,
} from "./match_pattern.ts";
import { EXPECTED_TYPE_PROBE } from "./type_inference.ts";
import type { LayoutNode, PathStep } from "./types.ts";
import { applySelection, findSelectedNode } from "./selection.ts";
import { getOptionValueForExpression } from "./type_inference.ts";

const optionVariants: ReadonlyArray<PatternVariant> = [
  { tag: "none", hasPayload: false },
  { tag: "some", hasPayload: true },
];

/** `Let x = some(100) in match x { some(val) => val + 23 }` */
const matchExpression = {
  Let: {
    bindings: [
      {
        variable_id: 1,
        variable_name: "x",
        value: {
          Variant: {
            tag: "some",
            payload: { Number: { value: 100 } },
            type_part_definition_event_hash: null,
          },
        },
      },
    ],
    body: {
      Match: {
        target: { Variable: { variable_id: 1 } },
        arms: [
          {
            tag: "some",
            variable_id: 2,
            variable_name: "val",
            body: {
              Add: {
                left: { Variable: { variable_id: 2 } },
                right: { Number: { value: 23 } },
              },
            },
          },
        ],
        default: null,
      },
    },
  },
};

const pattern = (index: number): ReadonlyArray<PathStep> => [
  "letBody",
  { kind: "matchArmPattern", index },
];

const armsOf = (expr: unknown): ReadonlyArray<Record<string, unknown>> =>
  (expr as { Let: { body: { Match: { arms: [] } } } }).Let.body.Match.arms;

function findNode(node: LayoutNode, id: string): LayoutNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

describe("match のパターンの編集", () => {
  it("アームをパターン (タグ) のノードと束縛する変数の名前のノードで表示する", () => {
    const root = expressionToLayoutNode(matchExpression);
    const arm = findNode(root, "root.body.arm_0");
    expect(arm?.label).toBe("some =>");
    expect(arm?.path).toEqual(pattern(0));
    expect(arm?.children[0]).toMatchObject({
      label: "val",
      kind: "parameterName",
      path: ["letBody", { kind: "matchArmVariable", index: 0 }],
    });
    // 本体では束縛した変数の名前が見える
    expect(arm?.children[1]?.scopeVariables?.get(2)).toBe("val");
  });

  it("対象を [対象, probe] のリストにして対象の型を型チェッカーに聞く", () => {
    const probed = probeMatchTargetType(matchExpression, pattern(0)) as {
      Let: { body: { Match: { target: unknown; arms: unknown } } };
    };
    expect(probed.Let.body.Match.target).toEqual({
      ListLiteral: {
        items: [{ Variable: { variable_id: 1 } }, EXPECTED_TYPE_PROBE],
      },
    });
    expect(probed.Let.body.Match.arms).toEqual(
      matchExpression.Let.body.Match.arms,
    );
  });

  it("型チェッカーが返した型からタグを求める", () => {
    expect(patternVariantsFromTypeAst({ tag: "boolean" }, new Map())).toEqual([
      { tag: "true", hasPayload: false },
      { tag: "false", hasPayload: false },
    ]);
    expect(
      patternVariantsFromTypeAst(
        {
          tag: "union",
          payload: [
            { tag: "none", payload_type: { tag: "none", payload: null } },
            {
              tag: "some",
              payload_type: { tag: "some", payload: { tag: "number" } },
            },
          ],
        },
        new Map(),
      ),
    ).toEqual(optionVariants);
    const typePart = {
      expression: {
        TypeUnion: {
          variants: [
            { tag: "none", payload_type: null },
            { tag: "some", payload_type: "TypeNumber" },
          ],
        },
      },
    };
    expect(
      patternVariantsFromTypeAst(
        { tag: "reference", payload: { part_hash: "option-id" } },
        new Map([["option-id", typePart]]),
      ),
    ).toEqual(optionVariants);
    expect(patternVariantsFromTypeAst({ tag: "number" }, new Map())).toBeNull();
    expect(patternVariantsFromTypeAst(null, new Map())).toBeNull();
  });

  it("タグ・束縛・アームの追加と削除の選択肢を出す", () => {
    const options = patternSelectorOptions({
      expression: matchExpression,
      patternPath: pattern(0),
      variants: optionVariants,
    });
    expect(options.map((o) => o.value)).toEqual([
      "pattern:tag:none",
      "pattern:tag:some",
      PATTERN_UNBIND,
      PATTERN_ADD_ARM,
      PATTERN_ADD_MISSING_ARMS,
      PATTERN_ADD_DEFAULT,
    ]);
    expect(currentPatternOptionValue(matchExpression, pattern(0))).toBe(
      "pattern:tag:some",
    );
    // 対象の型が分からなくても今のタグと束縛の切り替えは選べる
    expect(
      patternSelectorOptions({
        expression: matchExpression,
        patternPath: pattern(0),
        variants: null,
      }).map((o) => o.value),
    ).toEqual([
      "pattern:tag:some",
      PATTERN_UNBIND,
      PATTERN_ADD_ARM,
      PATTERN_ADD_DEFAULT,
    ]);
  });

  it("値を持たないタグに変えると束縛をやめ, 値を持つタグに変えると新しい変数に束縛する", () => {
    const toNone = applyPatternSelection(
      matchExpression,
      pattern(0),
      "pattern:tag:none",
      optionVariants,
    );
    expect(armsOf(toNone)[0]).toMatchObject({
      tag: "none",
      variable_id: null,
      variable_name: null,
    });
    const backToSome = applyPatternSelection(
      toNone,
      pattern(0),
      "pattern:tag:some",
      optionVariants,
    );
    // 式全体で使われていない ID (束縛していた 2 は本体にまだ残っている)
    expect(armsOf(backToSome)[0]).toMatchObject({
      tag: "some",
      variable_id: 3,
      variable_name: "value",
    });
    expect(
      armsOf(
        applyPatternSelection(
          matchExpression,
          pattern(0),
          PATTERN_UNBIND,
          null,
        ),
      )[0],
    ).toMatchObject({ variable_id: null });
    expect(
      armsOf(applyPatternSelection(toNone, pattern(0), PATTERN_BIND, null))[0],
    ).toMatchObject({ variable_id: 3, variable_name: "value" });
  });

  it("足りないアームを足し, アームを消す", () => {
    const added = applyPatternSelection(
      matchExpression,
      pattern(0),
      PATTERN_ADD_MISSING_ARMS,
      optionVariants,
    );
    expect(armsOf(added)).toEqual([
      matchExpression.Let.body.Match.arms[0],
      {
        tag: "none",
        variable_id: null,
        variable_name: null,
        body: { Hole: {} },
      },
    ]);
    expect(
      armsOf(
        applyPatternSelection(
          matchExpression,
          pattern(0),
          PATTERN_ADD_ARM,
          optionVariants,
        ),
      ).map((arm) => arm.tag),
    ).toEqual(["some", "none"]);
    // 全てのタグのアームがあれば足す選択肢は出さず, 2 つ以上あれば消せる
    expect(
      patternSelectorOptions({
        expression: added,
        patternPath: pattern(1),
        variants: optionVariants,
      }).map((o) => o.value),
    ).toEqual([
      "pattern:tag:none",
      "pattern:tag:some",
      PATTERN_BIND,
      PATTERN_ADD_DEFAULT,
      PATTERN_DELETE_ARM,
    ]);
    expect(
      armsOf(
        applyPatternSelection(
          added,
          pattern(0),
          PATTERN_DELETE_ARM,
          optionVariants,
        ),
      ).map((arm) => arm.tag),
    ).toEqual(["none"]);
  });

  it("束縛する変数の名前だけを変える", () => {
    const renamed = renameMatchArmVariable(
      matchExpression,
      ["letBody", { kind: "matchArmVariable", index: 0 }],
      "n",
    );
    expect(armsOf(renamed)[0]).toMatchObject({
      variable_id: 2,
      variable_name: "n",
    });
    const arm = findNode(expressionToLayoutNode(renamed), "root.body.arm_0");
    expect(
      findNode(arm as LayoutNode, "root.body.arm_0.body.left")?.label,
    ).toBe("n");
  });

  it("`_ =>` (default) のアームを足し, パターンのメニューから足りないアームを足して消す", () => {
    const withDefault = applyPatternSelection(
      matchExpression,
      pattern(0),
      PATTERN_ADD_DEFAULT,
      optionVariants,
    ) as { Let: { body: { Match: { default: unknown } } } };
    expect(withDefault.Let.body.Match.default).toEqual({ Hole: {} });
    const root = expressionToLayoutNode(withDefault);
    expect(findNode(root, "root.body.default")).toMatchObject({
      label: "_ =>",
      path: ["letBody", "matchDefaultPattern"],
    });
    const defaultPattern: ReadonlyArray<PathStep> = [
      "letBody",
      "matchDefaultPattern",
    ];
    expect(currentPatternOptionValue(withDefault, defaultPattern)).toBe(
      PATTERN_DEFAULT,
    );
    expect(
      patternSelectorOptions({
        expression: withDefault,
        patternPath: defaultPattern,
        variants: optionVariants,
      }).map((o) => o.value),
    ).toEqual([
      PATTERN_DEFAULT,
      PATTERN_ADD_MISSING_ARMS,
      PATTERN_DELETE_DEFAULT,
    ]);
    const filled = applyPatternSelection(
      withDefault,
      defaultPattern,
      PATTERN_ADD_MISSING_ARMS,
      optionVariants,
    );
    expect(armsOf(filled).map((arm) => arm.tag)).toEqual(["some", "none"]);
    const withoutDefault = applyPatternSelection(
      filled,
      defaultPattern,
      PATTERN_DELETE_DEFAULT,
      optionVariants,
    ) as { Let: { body: { Match: { default: unknown } } } };
    expect(withoutDefault.Let.body.Match.default).toBeNull();
  });

  it("対象の型を問わない match は `_ =>` だけで作り, アームが無ければ `_ =>` は消せない", () => {
    const created = applySelection({ Hole: {} }, [], "expr:match");
    expect(created).toEqual({
      Match: { target: { Hole: {} }, arms: [], default: { Hole: {} } },
    });
    expect(getOptionValueForExpression(created)).toBe("expr:match");
    expect(
      patternSelectorOptions({
        expression: created,
        patternPath: ["matchDefaultPattern"],
        variants: optionVariants,
      }).map((o) => o.value),
    ).toEqual([PATTERN_DEFAULT, PATTERN_ADD_MISSING_ARMS]);
    expect(
      applyPatternSelection(
        created,
        ["matchDefaultPattern"],
        PATTERN_DELETE_DEFAULT,
        optionVariants,
      ),
    ).toEqual(created);
  });

  it("式でない名前のノードも選んだノードとして見つける", () => {
    const root = expressionToLayoutNode(matchExpression);
    const variablePath: ReadonlyArray<PathStep> = [
      "letBody",
      { kind: "matchArmVariable", index: 0 },
    ];
    expect(findSelectedNode(root, variablePath)?.kind).toBe("parameterName");
    // 式のノードはパスが同じ式でないノードより優先する
    expect(findSelectedNode(root, ["letBody"])?.label).toBe("match");
  });
});
