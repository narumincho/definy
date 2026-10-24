import { isSamePath, type LayoutNode, type PathStep } from "./types.ts";
import { variantFromOptionValue } from "./variant.ts";
import { updateExpressionAtPath } from "./path.ts";
import { BUILTIN_PARAMETERS, compilerBuiltinName } from "../stage1_compiler.ts";
import { none, variant, variantPayload } from "../definy_value.ts";
import {
  booleanExpression,
  callExpression,
  callOf,
  hole,
  letChain,
  matchExpression,
  NO_VARIABLE,
  numberExpression,
  partReferenceExpression,
  partReferenceIdOf,
  stringExpression,
  variableExpression,
  variableIdOf,
} from "./expression.ts";

const typeNumber = variant("type_number");

/** 型のツリーエディタで選んだ型の既定の式 (part_type.ts の型の式) */
export const TYPE_SELECTIONS: Readonly<Record<string, unknown>> = {
  "expr:type:number": typeNumber,
  "expr:type:string": variant("type_string"),
  "expr:type:boolean": variant("type_boolean"),
  "expr:type:type": variant("type_type"),
  "expr:type:secret": variant("type_secret"),
  "expr:type:list": variant("type_list", { item_type: typeNumber }),
  "expr:type:code": variant("type_code", { value_type: typeNumber }),
  "expr:type:function": variant("type_function", {
    parameters: [{ name: "x", type: typeNumber }],
    return_type: typeNumber,
  }),
  "expr:type:record": variant("type_record", [
    { key: "key", value: variant("type_string") },
  ]),
  "expr:type:union": variant("type_union", [
    { tag: "a", payload_type: none() },
    { tag: "b", payload_type: none() },
  ]),
};

/**
 * パーツの引数名. 関数の型のパーツは型の引数名, 型の無いコンパイラ組み込みのパーツ (`core.equal` など,
 * 引数の型が決まらないもの) は組み込みの引数名. 関数でなければ `undefined`
 */
export function partParameterNames(part: {
  readonly partType: unknown;
  readonly expression: unknown;
}): ReadonlyArray<string> | undefined {
  const fn = functionTypeOf(part.partType);
  if (fn !== undefined) {
    return (fn.parameters ?? []).map((parameter) => String(parameter.name));
  }
  const builtin = compilerBuiltinName(part.expression);
  return builtin === undefined ? undefined : BUILTIN_PARAMETERS.get(builtin);
}

/** 関数の型 (`core.type-ast` の `function({ parameters, return_type })`) の中身. 関数の型でなければ `undefined` */
function functionTypeOf(type: unknown):
  | {
      readonly parameters?: ReadonlyArray<{
        readonly name?: unknown;
        readonly type?: unknown;
      }>;
      readonly return_type?: unknown;
    }
  | undefined {
  return variantPayload(type, "function") as
    | {
        readonly parameters?: ReadonlyArray<{
          readonly name?: unknown;
          readonly type?: unknown;
        }>;
        readonly return_type?: unknown;
      }
    | undefined;
}

/**
 * 関数 (`function`) の引数の変数 ID → 引数の型 (`core.type-ast` の値). 型は書いた位置で決まるものだけ求める:
 * パーツの式の直下の関数はパーツの型 (`partType`), 呼び出しの引数に書いた関数は呼び出すパーツ・関数型の引数の
 * その引数の型. `partTypeOf` はパーツ ID (Base64URL) からパーツの型を返す
 */
export function functionParameterTypes(
  expression: unknown,
  partType: unknown,
  partTypeOf: (partHash: string) => unknown,
): ReadonlyMap<number, unknown> {
  const types = new Map<number, unknown>();
  const calleeParameters = (
    callee: unknown,
  ): ReadonlyArray<{ readonly name?: unknown; readonly type?: unknown }> => {
    const partId = partReferenceIdOf(callee);
    if (partId !== null) {
      return functionTypeOf(partTypeOf(partId))?.parameters ?? [];
    }
    const variableId = variableIdOf(callee);
    if (variableId !== null) {
      return functionTypeOf(types.get(variableId))?.parameters ?? [];
    }
    return [];
  };
  const visit = (node: unknown, expectedType: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, undefined));
      return;
    }
    if (!node || typeof node !== "object" || node instanceof Uint8Array) {
      return;
    }
    const fn = variantPayload(node, "function") as
      | {
          readonly parameters?: ReadonlyArray<{
            readonly parameter_id?: unknown;
          }>;
          readonly body?: unknown;
        }
      | undefined;
    if (fn !== undefined) {
      const fnType = functionTypeOf(expectedType);
      (fn.parameters ?? []).forEach((parameter, index) => {
        const type = fnType?.parameters?.[index]?.type;
        if (type !== undefined) {
          types.set(Number(parameter.parameter_id), type);
        }
      });
      visit(fn.body, fnType?.return_type);
      return;
    }
    const call = callOf(node);
    if (call !== undefined) {
      const parameters = calleeParameters(call.callee);
      visit(call.callee, undefined);
      for (const argument of call.arguments) {
        visit(
          argument.value,
          parameters.find((parameter) => parameter.name === argument.name)
            ?.type,
        );
      }
      return;
    }
    Object.values(node).forEach((child) => visit(child, undefined));
  };
  visit(expression, partType);
  return types;
}

/** 関数型の変数の引数名. 型が関数でない・分からない変数は `undefined` */
export function variableParameterNames(
  type: unknown,
): ReadonlyArray<string> | undefined {
  return functionTypeOf(type)?.parameters?.map((parameter) =>
    String(parameter.name),
  );
}

/**
 * パーツを選んだときの式. 関数のパーツ (`parameterNames` がある) はそのパーツの呼び出しにする.
 * 選んだ位置がすでにパーツの呼び出しなら, 同じ名前の引数の式を引き継ぐ (例: `core.less-than` → `core.less-than-or-equal`)
 */
export function partSelection(
  reference: unknown,
  parameterNames: ReadonlyArray<string> | undefined,
  current: unknown,
): unknown {
  if (parameterNames === undefined) {
    return reference;
  }
  const currentArguments = callOf(current)?.arguments ?? [];
  return callExpression(
    reference,
    parameterNames.map((name) => ({
      name,
      value:
        currentArguments.find((argument) => argument.name === name)?.value ??
        hole(),
    })),
  );
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

/**
 * 置換メニューで選んだ選択肢 (`selectionValue`) の式に, `path` の位置の式を置き換える.
 * `parameterNamesOf` はパーツ ID (Base64URL) からそのパーツの引数名 ({@link partParameterNames}) を返す.
 * 関数のパーツを選ぶと, そのパーツの呼び出しにする. `variableParameterNamesOf` は変数 ID から関数型の変数の引数名を返し,
 * 関数型の変数を選んだときもその変数の呼び出しにする
 */
export function applySelection(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  selectionValue: string,
  parameterNamesOf: (
    partHash: string,
  ) => ReadonlyArray<string> | undefined = () => undefined,
  variableParameterNamesOf: (
    variableId: number,
  ) => ReadonlyArray<string> | undefined = () => undefined,
): unknown {
  let newSubExpr: unknown;

  if (selectionValue === "expr:number") {
    newSubExpr = numberExpression(0);
  } else if (selectionValue === "expr:string") {
    newSubExpr = stringExpression("");
  } else if (selectionValue === "expr:boolean:true") {
    newSubExpr = booleanExpression(true);
  } else if (selectionValue === "expr:boolean:false") {
    newSubExpr = booleanExpression(false);
  } else if (selectionValue === "expr:hole") {
    newSubExpr = hole();
  } else if (selectionValue === "expr:list") {
    newSubExpr = variant("list", []);
  } else if (selectionValue === "expr:secret") {
    // ID はシークレットを区別するだけなので, 作るときにランダムに決める (値はブラウザに保存する. docs/secret.md)
    newSubExpr = variant("secret", {
      id: crypto.randomUUID(),
      label: "secret",
      allowed_url_prefixes: [],
    });
  } else if (selectionValue === "expr:quote") {
    newSubExpr = variant("quote", hole());
  } else if (selectionValue === "expr:let") {
    // 新しい変数は式全体で使われていない ID にし, 本体はその変数を参照しておく
    const variableId = nextVariableId(expr);
    newSubExpr = letChain(
      [
        {
          variable_id: variableId,
          variable_name: "x",
          value: numberExpression(0),
        },
      ],
      variableExpression(variableId),
    );
  } else if (selectionValue === "expr:match") {
    // 対象の型はまだ分からないので `_ =>` だけにしておき,
    // 対象を決めてから `_ =>` のパターンのメニューで足りないアームを足す
    newSubExpr = matchExpression(hole(), [
      { tag: "_", variable_id: NO_VARIABLE, variable_name: "", body: hole() },
    ]);
  } else if (selectionValue === "expr:match_boolean") {
    const arm = (tag: string) => ({
      tag,
      variable_id: NO_VARIABLE,
      variable_name: "",
      body: numberExpression(0),
    });
    newSubExpr = matchExpression(booleanExpression(false), [
      arm("true"),
      arm("false"),
    ]);
  } else if (selectionValue in TYPE_SELECTIONS) {
    newSubExpr = TYPE_SELECTIONS[selectionValue];
  } else if (selectionValue.startsWith("variant:")) {
    return updateExpressionAtPath(expr, path, (current) =>
      variantFromOptionValue(selectionValue, current),
    );
  } else if (selectionValue.startsWith("ref:local:")) {
    const varId = Number(selectionValue.replace("ref:local:", ""));
    // 関数型の変数は値として書けないので, 引数名を入れた呼び出しにする
    return updateExpressionAtPath(expr, path, (current) =>
      partSelection(
        variableExpression(varId),
        variableParameterNamesOf(varId),
        current,
      ),
    );
  } else if (selectionValue.startsWith("ref:part:")) {
    const partHash = selectionValue.replace("ref:part:", "");
    const reference = partReferenceExpression(partHash);
    return updateExpressionAtPath(expr, path, (current) =>
      partSelection(reference, parameterNamesOf(partHash), current),
    );
  } else {
    return expr;
  }

  return updateExpressionAtPath(expr, path, () => newSubExpr);
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

/** その ID のノードを探す */
export function findNodeById(node: LayoutNode, id: string): LayoutNode | null {
  if (node.id === id) {
    return node;
  }
  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found !== null) return found;
  }
  return null;
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
