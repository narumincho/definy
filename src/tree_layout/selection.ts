import { isSamePath, type LayoutNode, type PathStep } from "./types.ts";
import { variantFromOptionValue } from "./variant.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import { recordExpressionFor, recordGetExpression } from "./record_fields.ts";
import { RECORD_FIELD_OPTION_PREFIX } from "./selector_options.ts";
import { BUILTIN_PARAMETERS, compilerBuiltinName } from "../stage1_compiler.ts";
import { none, variant, variantPayload } from "../definy_value.ts";
import {
  booleanExpression,
  callExpression,
  callOf,
  hole,
  isHole,
  letChain,
  matchExpression,
  literalArm,
  wildcardArm,
  floatExpression,
  numberExpression,
  partReferenceExpression,
  partReferenceIdOf,
  stringExpression,
  variableExpression,
  variableIdOf,
} from "./expression.ts";

const typeNumber = variant("type_number");

/** 型のツリーエディタの型引数 (`T`) の選択肢の value の頭. 後ろに型引数の名前が付く */
const TYPE_PARAMETER_OPTION_PREFIX = "expr:type:parameter:";

/** 型のツリーエディタで選んだ型の既定の式 (part_type.ts の型の式) */
const TYPE_SELECTIONS: Readonly<Record<string, unknown>> = {
  "expr:type:number": typeNumber,
  "expr:type:float": variant("type_float"),
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

/** 呼び出す関数の引数. `type` は引数の型 (`core.type-ast` の値). 型の無い組み込みのパーツは無い */
type CalleeParameter = {
  readonly name: string;
  readonly type?: unknown;
};

/**
 * パーツの引数. 関数の型のパーツは型の引数, 型の無いコンパイラ組み込みのパーツ (`core.equal` など,
 * 引数の型が決まらないもの) は組み込みの引数名. 関数でなければ `undefined`
 */
export function partParameters(part: {
  readonly partType: unknown;
  readonly expression: unknown;
}): ReadonlyArray<CalleeParameter> | undefined {
  const fn = functionTypeOf(part.partType);
  if (fn !== undefined) {
    return (fn.parameters ?? []).map((parameter) => ({
      name: String(parameter.name),
      type: parameter.type,
    }));
  }
  const builtin = compilerBuiltinName(part.expression);
  return builtin === undefined
    ? undefined
    : BUILTIN_PARAMETERS.get(builtin)?.map((name) => ({ name }));
}

/**
 * 関数の型の中身 `{ parameters, return_type }`. 関数の型でなければ `undefined`.
 * パーツの型 (型の式 `type_function`) と, 型チェッカーが返す型 (`core.type-ast` の `function`) のどちらも受け取る.
 * 2 つは同じ形 (`parameters: [{ name, type }]`) で, 引数の型も同じ形のまま返す
 */
function functionTypeOf(type: unknown):
  | {
      readonly parameters?: ReadonlyArray<{
        readonly name?: unknown;
        readonly type?: unknown;
      }>;
      readonly return_type?: unknown;
    }
  | undefined {
  return (variantPayload(type, "type_function") ??
    variantPayload(type, "function")) as
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
 * 関数 (`function`) の引数の変数 ID → 引数の型 (型の式). 型は書いた位置で決まるものだけ求める:
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

/** 関数型の変数の引数. 型が関数でない・分からない変数は `undefined` */
export function variableParameters(
  type: unknown,
): ReadonlyArray<CalleeParameter> | undefined {
  return functionTypeOf(type)?.parameters?.map((parameter) => ({
    name: String(parameter.name),
    type: parameter.type,
  }));
}

/**
 * パーツを選んだときの式. 関数のパーツ (`parameters` がある) はそのパーツの呼び出しにする.
 * 選んだ位置がすでにパーツの呼び出しなら, 同じ名前の引数の式を引き継ぐ (例: `core.less-than` → `core.less-than-or-equal`).
 * 引き継がない引数は未入力にし, 関数型の引数は本体を未入力にしたラムダ式 (`f: (item) => □`) にする.
 * ラムダ式の引数の変数 ID は `firstVariableId` から順に振る (式全体で使われていない ID を渡す)
 */
export function partSelection(
  reference: unknown,
  parameters: ReadonlyArray<CalleeParameter> | undefined,
  current: unknown,
  firstVariableId: number,
): unknown {
  if (parameters === undefined) {
    return reference;
  }
  const currentArguments = callOf(current)?.arguments ?? [];
  let nextId = firstVariableId;
  return callExpression(
    reference,
    parameters.map(({ name, type }) => {
      const inherited = currentArguments.find(
        (argument) => argument.name === name,
      )?.value;
      if (inherited !== undefined) {
        return { name, value: inherited };
      }
      const fn = functionTypeOf(type);
      if (fn === undefined) {
        return { name, value: hole() };
      }
      return {
        name,
        value: variant("function", {
          parameters: (fn.parameters ?? []).map((parameter) => ({
            parameter_id: nextId++,
            parameter_name: String(parameter.name),
          })),
          body: hole(),
        }),
      };
    }),
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
 * `parametersOf` はパーツ ID (Base64URL) からそのパーツの引数 ({@link partParameters}) を返す.
 * 関数のパーツを選ぶと, そのパーツの呼び出しにする. `variableParametersOf` は変数 ID から関数型の変数の引数を返し,
 * 関数型の変数を選んだときもその変数の呼び出しにする.
 * `expectedType` (その位置で期待する型, `core.type-ast` の値) が関数の型なら, 選んだ式をラムダ式で包む ({@link applySelectionInLambda})
 */
export function applySelection(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  selectionValue: string,
  parametersOf: (
    partHash: string,
  ) => ReadonlyArray<CalleeParameter> | undefined = () => undefined,
  variableParametersOf: (
    variableId: number,
  ) => ReadonlyArray<CalleeParameter> | undefined = () => undefined,
  expectedType: unknown = undefined,
): unknown {
  const expectedFunction = functionTypeOf(expectedType);
  if (
    expectedFunction !== undefined &&
    selectionValue !== "expr:hole" &&
    !(selectionValue in TYPE_SELECTIONS) &&
    !selectionValue.startsWith(TYPE_PARAMETER_OPTION_PREFIX)
  ) {
    return applySelectionInLambda(
      expr,
      path,
      selectionValue,
      expectedFunction,
      parametersOf,
      variableParametersOf,
    );
  }
  let newSubExpr: unknown;

  if (selectionValue === "expr:number") {
    newSubExpr = numberExpression(0);
  } else if (selectionValue === "expr:float") {
    newSubExpr = floatExpression(0, 0);
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
  } else if (selectionValue === "expr:record") {
    // 期待する型がレコードなら, そのフィールドを未入力にしておく
    newSubExpr = recordExpressionFor(expectedType);
  } else if (selectionValue === "expr:record_get") {
    newSubExpr = recordGetExpression(hole(), "key");
  } else if (selectionValue.startsWith(RECORD_FIELD_OPTION_PREFIX)) {
    const [id = "", ...key] = selectionValue
      .slice(RECORD_FIELD_OPTION_PREFIX.length)
      .split(":");
    newSubExpr = recordGetExpression(
      variableExpression(Number(id)),
      key.join(":"),
    );
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
    newSubExpr = matchExpression(hole(), [wildcardArm(hole())]);
  } else if (selectionValue === "expr:match_boolean") {
    const arm = (tag: string) =>
      literalArm("boolean", tag, numberExpression(0));
    newSubExpr = matchExpression(booleanExpression(false), [
      arm("true"),
      arm("false"),
    ]);
  } else if (selectionValue in TYPE_SELECTIONS) {
    newSubExpr = TYPE_SELECTIONS[selectionValue];
  } else if (selectionValue.startsWith(TYPE_PARAMETER_OPTION_PREFIX)) {
    newSubExpr = variant(
      "type_parameter",
      selectionValue.slice(TYPE_PARAMETER_OPTION_PREFIX.length),
    );
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
        variableParametersOf(varId),
        current,
        nextVariableId(expr),
      ),
    );
  } else if (selectionValue.startsWith("ref:part:")) {
    const partHash = selectionValue.replace("ref:part:", "");
    const reference = partReferenceExpression(partHash);
    return updateExpressionAtPath(expr, path, (current) =>
      partSelection(
        reference,
        parametersOf(partHash),
        current,
        nextVariableId(expr),
      ),
    );
  } else {
    return expr;
  }

  return updateExpressionAtPath(expr, path, () => newSubExpr);
}

type FunctionParameter = {
  readonly parameter_id: number;
  readonly parameter_name: string;
};

/**
 * 関数の型を期待する位置 (`core.list-map` の `f:` など) で選んだ式を, その型の引数を持つラムダ式の本体にする.
 * 関数は値として書けないので (docs/call-syntax.md), 関数のパーツ・関数型の変数を選ぶと `(item) => パーツ(x: item)` になる.
 * すでにラムダ式ならその引数をそのまま使い, 本体だけを置き換える.
 * 本体の呼び出しの未入力の引数には, 同じ名前のラムダ式の引数を, 無ければ残りの引数を順に入れる
 */
function applySelectionInLambda(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  selectionValue: string,
  expectedFunction: NonNullable<ReturnType<typeof functionTypeOf>>,
  parametersOf: (
    partHash: string,
  ) => ReadonlyArray<CalleeParameter> | undefined,
  variableParametersOf: (
    variableId: number,
  ) => ReadonlyArray<CalleeParameter> | undefined,
): unknown {
  const current = variantPayload(
    getExpressionAtPath(expr, path),
    "function",
  ) as
    | {
        readonly parameters?: ReadonlyArray<FunctionParameter>;
        readonly body?: unknown;
      }
    | undefined;
  const firstId = nextVariableId(expr);
  const parameters: ReadonlyArray<FunctionParameter> =
    current?.parameters ??
    (expectedFunction.parameters ?? []).map((parameter, index) => ({
      parameter_id: firstId + index,
      parameter_name: String(parameter.name),
    }));
  const withLambda = updateExpressionAtPath(expr, path, () =>
    variant("function", { parameters, body: current?.body ?? hole() }),
  );
  const bodyPath = [...path, "functionBody" as const];
  const selected = applySelection(
    withLambda,
    bodyPath,
    selectionValue,
    parametersOf,
    variableParametersOf,
  );
  return updateExpressionAtPath(selected, bodyPath, (body) =>
    fillArgumentsWithParameters(body, parameters),
  );
}

/** 呼び出しの未入力の引数に, 同じ名前の引数の変数を, 無ければ名前で使われなかった引数の変数を順に入れる */
function fillArgumentsWithParameters(
  body: unknown,
  parameters: ReadonlyArray<FunctionParameter>,
): unknown {
  const call = callOf(body);
  if (call === undefined) {
    return body;
  }
  const names = new Set(call.arguments.map((argument) => argument.name));
  const rest = parameters.filter(
    (parameter) => !names.has(parameter.parameter_name),
  );
  return callExpression(
    call.callee,
    call.arguments.map((argument) => {
      if (!isHole(argument.value)) {
        return argument;
      }
      const parameter =
        parameters.find(
          (parameter) => parameter.parameter_name === argument.name,
        ) ?? rest.shift();
      return parameter === undefined
        ? argument
        : { ...argument, value: variableExpression(parameter.parameter_id) };
    }),
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
