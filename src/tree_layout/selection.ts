import { isSamePath, type LayoutNode, type PathStep } from "./types.ts";
import { base64ToBytes } from "../cbor.ts";
import { variantFromOptionValue } from "./variant.ts";
import { updateExpressionAtPath } from "./path.ts";
import {
  BUILTIN_PARAMETERS,
  compilerBuiltinName,
  partReferenceId,
} from "../stage1_compiler.ts";

/** 型のツリーエディタで選んだ型の既定の式 (part_type.ts の型の式) */
export const TYPE_SELECTIONS: Readonly<Record<string, unknown>> = {
  "expr:type:number": "TypeNumber",
  "expr:type:string": "TypeString",
  "expr:type:boolean": "TypeBoolean",
  "expr:type:type": "TypeType",
  "expr:type:secret": "TypeSecret",
  "expr:type:list": { TypeList: { item_type: "TypeNumber" } },
  "expr:type:code": { TypeCode: { value_type: "TypeNumber" } },
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

/**
 * パーツの引数名. 関数の型のパーツは型の引数名, 型の無いコンパイラ組み込みのパーツ (`core.equal` など,
 * 引数の型が決まらないもの) は組み込みの引数名. 関数でなければ `undefined`
 */
export function partParameterNames(part: {
  readonly partType: unknown;
  readonly expression: unknown;
}): ReadonlyArray<string> | undefined {
  const fn = (part.partType as { readonly function?: unknown } | null)
    ?.function as
    | { readonly parameters?: ReadonlyArray<{ readonly name?: unknown }> }
    | undefined;
  if (fn !== undefined) {
    return (fn.parameters ?? []).map((parameter) => String(parameter.name));
  }
  const builtin = compilerBuiltinName(part.expression);
  return builtin === undefined ? undefined : BUILTIN_PARAMETERS.get(builtin);
}

/** 関数の型 (`{function: {parameters, return_type}}`) の中身. 関数の型でなければ `undefined` */
function functionTypeOf(type: unknown):
  | {
      readonly parameters?: ReadonlyArray<{
        readonly name?: unknown;
        readonly type?: unknown;
      }>;
      readonly return_type?: unknown;
    }
  | undefined {
  return (type as { readonly function?: unknown } | null)?.function as
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
 * 関数 (`Function`) の引数の変数 ID → 引数の型. 型は書いた位置で決まるものだけ求める:
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
    const obj = callee as {
      readonly PartReference?: {
        readonly part_definition_event_hash?: unknown;
      };
      readonly Variable?: { readonly variable_id?: unknown };
    } | null;
    if (obj?.PartReference !== undefined) {
      try {
        return (
          functionTypeOf(
            partTypeOf(
              partReferenceId(obj.PartReference.part_definition_event_hash),
            ),
          )?.parameters ?? []
        );
      } catch {
        return [];
      }
    }
    if (obj?.Variable !== undefined) {
      return (
        functionTypeOf(types.get(Number(obj.Variable.variable_id)))
          ?.parameters ?? []
      );
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
    const obj = node as Record<string, unknown>;
    if ("Function" in obj) {
      const fn = obj.Function as {
        readonly parameters?: ReadonlyArray<{
          readonly parameter_id?: unknown;
        }>;
        readonly body?: unknown;
      };
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
    if ("Call" in obj) {
      const call = obj.Call as {
        readonly function?: unknown;
        readonly arguments?: ReadonlyArray<{
          readonly name?: unknown;
          readonly value?: unknown;
        }>;
      };
      const parameters = calleeParameters(call.function);
      visit(call.function, undefined);
      for (const argument of call.arguments ?? []) {
        visit(
          argument.value,
          parameters.find((parameter) => parameter.name === argument.name)
            ?.type,
        );
      }
      return;
    }
    Object.values(obj).forEach((child) => visit(child, undefined));
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
function partSelection(
  reference: unknown,
  parameterNames: ReadonlyArray<string> | undefined,
  current: unknown,
): unknown {
  if (parameterNames === undefined) {
    return reference;
  }
  const currentArguments =
    (
      current as {
        readonly Call?: {
          readonly arguments?: ReadonlyArray<{
            readonly name?: unknown;
            readonly value?: unknown;
          }>;
        };
      } | null
    )?.Call?.arguments ?? [];
  return {
    Call: {
      function: reference,
      arguments: parameterNames.map((name) => ({
        name,
        value: currentArguments.find((argument) => argument.name === name)
          ?.value ?? { Hole: {} },
      })),
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
    newSubExpr = { Number: { value: 0 } };
  } else if (selectionValue === "expr:string") {
    newSubExpr = { String: { value: "" } };
  } else if (selectionValue === "expr:boolean:true") {
    newSubExpr = { Boolean: { value: true } };
  } else if (selectionValue === "expr:boolean:false") {
    newSubExpr = { Boolean: { value: false } };
  } else if (selectionValue === "expr:hole") {
    newSubExpr = { Hole: {} };
  } else if (selectionValue === "expr:list") {
    newSubExpr = { ListLiteral: { items: [] } };
  } else if (selectionValue === "expr:secret") {
    // ID はシークレットを区別するだけなので, 作るときにランダムに決める (値はブラウザに保存する. docs/secret.md)
    newSubExpr = {
      Secret: {
        id: crypto.randomUUID(),
        label: "secret",
        allowed_url_prefixes: [],
      },
    };
  } else if (selectionValue === "expr:quote") {
    newSubExpr = { Quote: { expression: { Hole: {} } } };
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
  } else if (selectionValue.startsWith("variant:")) {
    return updateExpressionAtPath(expr, path, (current) =>
      variantFromOptionValue(selectionValue, current),
    );
  } else if (selectionValue.startsWith("ref:local:")) {
    const varId = Number(selectionValue.replace("ref:local:", ""));
    // 関数型の変数は値として書けないので, 引数名を入れた呼び出しにする
    return updateExpressionAtPath(expr, path, (current) =>
      partSelection(
        { Variable: { variable_id: varId } },
        variableParameterNamesOf(varId),
        current,
      ),
    );
  } else if (selectionValue.startsWith("ref:part:")) {
    const partHash = selectionValue.replace("ref:part:", "");
    const reference = {
      PartReference: {
        part_definition_event_hash: base64ToBytes(partHash),
      },
    };
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
