import { isSamePath, type LayoutNode, type PathStep } from "./types.ts";
import { base64ToBytes } from "../cbor.ts";
import { updateExpressionAtPath } from "./path.ts";

/** 型のツリーエディタで選んだ型の既定の式 (part_type.ts の型の式) */
export const TYPE_SELECTIONS: Readonly<Record<string, unknown>> = {
  "expr:type:number": "TypeNumber",
  "expr:type:string": "TypeString",
  "expr:type:boolean": "TypeBoolean",
  "expr:type:type": "TypeType",
  "expr:type:list": { TypeList: { item_type: "TypeNumber" } },
  "expr:type:function": {
    TypeFunction: {
      parameters: [{ name: "x", type: "TypeNumber" }],
      return_type: "TypeNumber",
    },
  },
  "expr:type:record": {
    TypeLiteral: { items: [{ key: "key", value: "TypeString" }] },
  },
  "expr:type:union": {
    TypeUnion: {
      variants: [
        { tag: "a", payload_type: null },
        { tag: "b", payload_type: null },
      ],
    },
  },
};

/** 左右 2 つの式を取る演算の式のキー */
export const BINARY_KEYS: ReadonlyArray<string> = [
  "Add",
  "Subtract",
  "Multiply",
  "Divide",
  "Remainder",
  "Equal",
  "NotEqual",
  "LessThan",
  "LessThanOrEqual",
  "GreaterThan",
  "GreaterThanOrEqual",
  "And",
  "Or",
  "StringConcat",
  "ListConcat",
  "BitAnd",
  "BitOr",
  "BitXor",
  "ShiftLeft",
  "ShiftRight",
];

function binaryOperands(expr: unknown): {
  readonly key: string;
  readonly left: unknown;
  readonly right: unknown;
} | null {
  if (!expr || typeof expr !== "object") return null;
  const node = expr as Record<string, unknown>;
  const key = BINARY_KEYS.find((k) => k in node);
  if (key === undefined) return null;
  const inner = node[key] as { left?: unknown; right?: unknown } | null;
  return { key, left: inner?.left, right: inner?.right };
}

/** 新しい式も元の式も二項演算なら, 元の左右の式を新しい式に移す */
export function keepBinaryOperands(next: unknown, current: unknown): unknown {
  const nextOperands = binaryOperands(next);
  const currentOperands = binaryOperands(current);
  if (nextOperands === null || currentOperands === null) {
    return next;
  }
  return {
    [nextOperands.key]: {
      left: currentOperands.left,
      right: currentOperands.right,
    },
  };
}

/** 式全体で使われている変数 ID (let の束縛, 関数のパラメーター, match の束縛) の最大 + 1 */
export function nextVariableId(expr: unknown): number {
  let max = -1;
  function walk(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object" || value instanceof Uint8Array) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (
        (key === "variable_id" || key === "parameter_id") &&
        typeof child === "number"
      ) {
        max = Math.max(max, child);
      } else {
        walk(child);
      }
    }
  }
  walk(expr);
  return max + 1;
}

export function applySelection(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  selectionValue: string,
): unknown {
  let newSubExpr: unknown;

  if (selectionValue === "expr:number") {
    newSubExpr = { Number: { value: 0 } };
  } else if (selectionValue === "expr:string") {
    newSubExpr = { String: { value: "" } };
  } else if (selectionValue === "expr:boolean:true") {
    newSubExpr = { Boolean: { value: true } };
  } else if (selectionValue === "expr:boolean:false") {
    newSubExpr = { Boolean: { value: false } };
  } else if (selectionValue === "expr:hole") {
    newSubExpr = { Hole: {} };
  } else if (selectionValue === "expr:add") {
    newSubExpr = {
      Add: { left: { Number: { value: 0 } }, right: { Number: { value: 0 } } },
    };
  } else if (selectionValue === "expr:subtract") {
    newSubExpr = {
      Subtract: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:multiply") {
    newSubExpr = {
      Multiply: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:divide") {
    newSubExpr = {
      Divide: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 1 } },
      },
    };
  } else if (selectionValue === "expr:remainder") {
    newSubExpr = {
      Remainder: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 1 } },
      },
    };
  } else if (selectionValue === "expr:equal") {
    newSubExpr = {
      Equal: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:not_equal") {
    newSubExpr = {
      NotEqual: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:less_than") {
    newSubExpr = {
      LessThan: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:greater_than") {
    newSubExpr = {
      GreaterThan: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:and") {
    newSubExpr = {
      And: {
        left: { Boolean: { value: true } },
        right: { Boolean: { value: true } },
      },
    };
  } else if (selectionValue === "expr:or") {
    newSubExpr = {
      Or: {
        left: { Boolean: { value: false } },
        right: { Boolean: { value: false } },
      },
    };
  } else if (selectionValue === "expr:not") {
    newSubExpr = {
      Not: { value: { Boolean: { value: false } } },
    };
  } else if (selectionValue === "expr:string_concat") {
    newSubExpr = {
      StringConcat: {
        left: { String: { value: "" } },
        right: { String: { value: "" } },
      },
    };
  } else if (selectionValue === "expr:list") {
    newSubExpr = { ListLiteral: { items: [] } };
  } else if (
    selectionValue === "expr:less_than_or_equal" ||
    selectionValue === "expr:greater_than_or_equal"
  ) {
    newSubExpr = {
      [selectionValue === "expr:less_than_or_equal"
        ? "LessThanOrEqual"
        : "GreaterThanOrEqual"]: {
        left: { Number: { value: 0 } },
        right: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:list_concat") {
    newSubExpr = {
      ListConcat: {
        left: { ListLiteral: { items: [] } },
        right: { ListLiteral: { items: [] } },
      },
    };
  } else if (selectionValue === "expr:list_get") {
    newSubExpr = {
      ListGet: {
        list: { ListLiteral: { items: [] } },
        index: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:list_length") {
    newSubExpr = { ListLength: { value: { ListLiteral: { items: [] } } } };
  } else if (selectionValue === "expr:list_append") {
    newSubExpr = {
      ListAppend: {
        list: { ListLiteral: { items: [] } },
        item: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:string_length") {
    newSubExpr = { StringLength: { value: { String: { value: "" } } } };
  } else if (selectionValue === "expr:string_slice") {
    newSubExpr = {
      StringSlice: {
        value: { String: { value: "" } },
        start: { Number: { value: 0 } },
        end: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue === "expr:let") {
    // 新しい変数は式全体で使われていない ID にし, 本体はその変数を参照しておく
    const variableId = nextVariableId(expr);
    newSubExpr = {
      Let: {
        bindings: [
          {
            variable_id: variableId,
            variable_name: "x",
            value: { Number: { value: 0 } },
          },
        ],
        body: { Variable: { variable_id: variableId } },
      },
    };
  } else if (selectionValue === "expr:match") {
    // 対象の型はまだ分からないので `_ =>` だけにしておき,
    // 対象を決めてから `_ =>` のパターンのメニューで足りないアームを足す
    newSubExpr = {
      Match: {
        target: { Hole: {} },
        arms: [],
        default: { Hole: {} },
      },
    };
  } else if (selectionValue === "expr:match_boolean") {
    const arm = (tag: string) => ({
      tag,
      variable_id: null,
      variable_name: null,
      body: { Number: { value: 0 } },
    });
    newSubExpr = {
      Match: {
        target: { Boolean: { value: false } },
        arms: [arm("true"), arm("false")],
        default: null,
      },
    };
  } else if (selectionValue in TYPE_SELECTIONS) {
    newSubExpr = TYPE_SELECTIONS[selectionValue];
  } else if (selectionValue === "expr:if") {
    newSubExpr = {
      If: {
        condition: { Boolean: { value: true } },
        then_expr: { Number: { value: 1 } },
        else_expr: { Number: { value: 0 } },
      },
    };
  } else if (selectionValue.startsWith("ref:local:")) {
    const varId = Number(selectionValue.replace("ref:local:", ""));
    newSubExpr = { Variable: { variable_id: varId } };
  } else if (selectionValue.startsWith("ref:part:")) {
    const partHash = selectionValue.replace("ref:part:", "");
    newSubExpr = {
      PartReference: {
        part_definition_event_hash: base64ToBytes(partHash),
      },
    };
  } else {
    return expr;
  }

  // 二項演算を別の二項演算に差し替えるときは, 既定値で上書きせず元の左右の式を引き継ぐ
  // (例: `index < 0` → `index <= 0`)
  return updateExpressionAtPath(expr, path, (current) =>
    keepBinaryOperands(newSubExpr, current),
  );
}

/** 表示順 (行きがけ順) にノード ID とパスを集める */
export function collectNodeIndex(node: LayoutNode): ReadonlyArray<{
  readonly id: string;
  readonly path: ReadonlyArray<PathStep>;
}> {
  return [
    { id: node.id, path: node.path },
    ...node.children.flatMap(collectNodeIndex),
  ];
}

/** そのパスの式を表すノード (式 1 つ分のノード) を探す */
export function findExpressionNode(
  node: LayoutNode,
  path: ReadonlyArray<PathStep>,
): LayoutNode | null {
  if (node.scopeVariables !== undefined && isSamePath(node.path, path)) {
    return node;
  }
  for (const child of node.children) {
    const found = findExpressionNode(child, path);
    if (found !== null) return found;
  }
  return null;
}

/**
 * 選んだパスのノードを探す. 式 1 つ分のノードを優先し, 無ければ式でないノード
 * (関数の引数名・match のパターンや束縛する変数の名前) を探す
 */
export function findSelectedNode(
  node: LayoutNode,
  path: ReadonlyArray<PathStep>,
): LayoutNode | null {
  return findExpressionNode(node, path) ?? findNodeAtPath(node, path);
}

function findNodeAtPath(
  node: LayoutNode,
  path: ReadonlyArray<PathStep>,
): LayoutNode | null {
  if (isSamePath(node.path, path)) {
    return node;
  }
  for (const child of node.children) {
    const found = findNodeAtPath(child, path);
    if (found !== null) return found;
  }
  return null;
}
