import { describe, expect, it } from "vitest";
import { expressionToLayoutNode } from "./ast_to_layout.ts";
import {
  PATTERN_ADD_ARM,
  PATTERN_ADD_MISSING_ARMS,
  PATTERN_BIND,
  PATTERN_DELETE_ARM,
  PATTERN_UNBIND,
  PATTERN_ADD_DEFAULT,
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
  "#let": {
    variable_id: 1,
    variable_name: "x",
    value: {
      "#variant": {
        tag: "some",
        payload: { "#some": { "#number": 100 } },
        type_part: { "#none": null },
      },
    },
    body: {
      "#match": {
        target: { "#variable": { variable_id: 1 } },
        arms: [
          {
            tag: "some",
            variable_id: 2,
            variable_name: "val",
            body: {
              "#call": {
                function: {
                  "#part_reference": {
                    part_definition_event_hash: "core.plus",
                  },
                },
                arguments: [
                  { name: "left", value: { "#variable": { variable_id: 2 } } },
                  { name: "right", value: { "#number": 23 } },
                ],
              },
            },
          },
        ],
      },
    },
  },
};

type MatchShape = {
  readonly "#let": {
    readonly body: {
      readonly "#match": {
        readonly target: unknown;
        readonly arms: ReadonlyArray<Record<string, unknown>>;
      };
    };
  };
};

const matchOfLet = (expr: unknown) =>
  (expr as MatchShape)["#let"].body["#match"];

const pattern = (index: number): ReadonlyArray<PathStep> => [
  "letBody",
  { kind: "matchArmPattern", index },
];

const armsOf = (expr: unknown): ReadonlyArray<Record<string, unknown>> =>
  matchOfLet(expr).arms;

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
    const probed = matchOfLet(
      probeMatchTargetType(matchExpression, pattern(0)),
    );
    expect(probed.target).toEqual({
      "#list": [{ "#variable": { variable_id: 1 } }, EXPECTED_TYPE_PROBE],
    });
    expect(probed.arms).toEqual(matchOfLet(matchExpression).arms);
  });

  it("型チェッカーが返した型からタグを求める", () => {
    expect(patternVariantsFromTypeAst({ "#boolean": null }, new Map())).toEqual(
      [
        { tag: "true", hasPayload: false },
        { tag: "false", hasPayload: false },
      ],
    );
    expect(
      patternVariantsFromTypeAst(
        {
          "#union": [
            { tag: "none", payload_type: { "#none": null } },
            { tag: "some", payload_type: { "#some": { "#number": null } } },
          ],
        },
        new Map(),
      ),
    ).toEqual(optionVariants);
    const typePart = {
      expression: {
        "#type_union": [
          { tag: "none", payload_type: { "#none": null } },
          { tag: "some", payload_type: { "#some": { "#type_number": null } } },
        ],
      },
    };
    expect(
      patternVariantsFromTypeAst(
        { "#reference": { part_hash: "option-id" } },
        new Map([["option-id", typePart]]),
      ),
    ).toEqual(optionVariants);
    expect(
      patternVariantsFromTypeAst({ "#number": null }, new Map()),
    ).toBeNull();
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
      "pattern:tag:_",
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
      "pattern:tag:_",
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
      variable_id: -1,
      variable_name: "",
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
    ).toMatchObject({ variable_id: -1, variable_name: "" });
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
      matchOfLet(matchExpression).arms[0],
      {
        tag: "none",
        variable_id: -1,
        variable_name: "",
        body: { "#hole": { probe: false } },
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
      "pattern:tag:_",
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
      findNode(arm as LayoutNode, "root.body.arm_0.body.arg_0.val")?.label,
    ).toBe("n");
  });

  it("`_ =>` のアームを足し, その前に足りないアームを足して消す", () => {
    const withDefault = applyPatternSelection(
      matchExpression,
      pattern(0),
      PATTERN_ADD_DEFAULT,
      optionVariants,
    );
    expect(armsOf(withDefault)[1]).toEqual({
      tag: "_",
      variable_id: -1,
      variable_name: "",
      body: { "#hole": { probe: false } },
    });
    const root = expressionToLayoutNode(withDefault);
    expect(findNode(root, "root.body.arm_1")).toMatchObject({
      label: "_ =>",
      path: pattern(1),
    });
    expect(currentPatternOptionValue(withDefault, pattern(1))).toBe(
      "pattern:tag:_",
    );
    // `_` は束縛しないので bind / unbind は出さない
    expect(
      patternSelectorOptions({
        expression: withDefault,
        patternPath: pattern(1),
        variants: optionVariants,
      }).map((o) => o.value),
    ).toEqual([
      "pattern:tag:none",
      "pattern:tag:some",
      "pattern:tag:_",
      PATTERN_ADD_ARM,
      PATTERN_ADD_MISSING_ARMS,
      PATTERN_DELETE_ARM,
    ]);
    const filled = applyPatternSelection(
      withDefault,
      pattern(1),
      PATTERN_ADD_MISSING_ARMS,
      optionVariants,
    );
    expect(armsOf(filled).map((arm) => arm.tag)).toEqual(["some", "none", "_"]);
    const withoutDefault = applyPatternSelection(
      filled,
      pattern(2),
      PATTERN_DELETE_ARM,
      optionVariants,
    );
    expect(armsOf(withoutDefault).map((arm) => arm.tag)).toEqual([
      "some",
      "none",
    ]);
  });

  it("対象の型を問わない match は `_ =>` だけで作り, 最後のアームは消せない", () => {
    const created = applySelection(
      { "#hole": { probe: false } },
      [],
      "expr:match",
    );
    expect(created).toEqual({
      "#match": {
        target: { "#hole": { probe: false } },
        arms: [
          {
            tag: "_",
            variable_id: -1,
            variable_name: "",
            body: { "#hole": { probe: false } },
          },
        ],
      },
    });
    expect(getOptionValueForExpression(created)).toBe("expr:match");
    const wildcardPattern: ReadonlyArray<PathStep> = [
      { kind: "matchArmPattern", index: 0 },
    ];
    expect(
      patternSelectorOptions({
        expression: created,
        patternPath: wildcardPattern,
        variants: optionVariants,
      }).map((o) => o.value),
    ).toEqual([
      "pattern:tag:none",
      "pattern:tag:some",
      "pattern:tag:_",
      PATTERN_ADD_ARM,
      PATTERN_ADD_MISSING_ARMS,
    ]);
    expect(
      applyPatternSelection(
        created,
        wildcardPattern,
        PATTERN_DELETE_ARM,
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
