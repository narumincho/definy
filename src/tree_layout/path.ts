import type { PathStep } from "./types.ts";
import {
  field,
  optionValue,
  some,
  variant,
  variantOf,
} from "../definy_value.ts";
import {
  hole,
  letChain,
  letChainOf,
  numberExpression,
  stringExpression,
} from "./expression.ts";

/**
 * 子の式をフィールド 1 つに持つ式 (タグ) の, パスの段とフィールド名の対応.
 * ast_to_layout.ts の表示とここでの取得・更新で同じ対応を使う.
 * フィールド名が `null` ならペイロードそのものが子の式
 */
export const FIELD_STEPS: Readonly<
  Record<
    string,
    ReadonlyArray<{ readonly step: string; readonly field: string | null }>
  >
> = {
  type_list: [{ step: "typeListItem", field: "item_type" }],
  type_code: [{ step: "typeCodeValue", field: "value_type" }],
  quote: [{ step: "quoteExpression", field: null }],
};

/** 子の式の読み書き. 読めなければ `get` は `undefined` を返す */
type Lens = {
  readonly get: () => unknown;
  readonly set: (child: unknown) => unknown;
};

function indexOf(head: PathStep, kind: string): number | null {
  return typeof head === "object" && head.kind === kind ? head.index : null;
}

function arrayAt(value: unknown): ReadonlyArray<unknown> {
  return Array.isArray(value) ? value : [];
}

/** レコードのリスト `items` の `index` 番目のフィールド `key` の読み書き */
function itemFieldLens(
  items: ReadonlyArray<unknown>,
  index: number,
  key: string,
  rebuild: (items: ReadonlyArray<unknown>) => unknown,
  wrapGet: (value: unknown) => unknown = (value) => value,
  wrapSet: (child: unknown) => unknown = (child) => child,
): Lens | undefined {
  const item = items[index];
  if (item === undefined) {
    return undefined;
  }
  return {
    get: () => wrapGet(field(item, key)),
    set: (child) =>
      rebuild(
        items.map((current, i) =>
          i === index
            ? { ...(current as object), [key]: wrapSet(child) }
            : current,
        ),
      ),
  };
}

/** 式 `expr` のパスの段 `head` の子の式の読み書き */
function stepLens(expr: unknown, head: PathStep): Lens | undefined {
  const tagged = variantOf(expr);
  if (tagged === undefined) {
    return undefined;
  }
  const { tag, payload } = tagged;
  const withPayload = (next: unknown) => variant(tag, next);
  const fieldLens = (key: string): Lens => ({
    get: () => field(payload, key),
    set: (child) => withPayload({ ...(payload as object), [key]: child }),
  });

  const fieldStep = FIELD_STEPS[tag]?.find((s) => s.step === head);
  if (fieldStep !== undefined) {
    if (fieldStep.field === null) {
      return { get: () => payload, set: withPayload };
    }
    return fieldLens(fieldStep.field);
  }

  switch (tag) {
    case "let": {
      const chain = letChainOf(expr);
      if (chain === undefined) {
        return undefined;
      }
      if (head === "letBody") {
        return {
          get: () => chain.body,
          set: (child) => letChain(chain.bindings, child),
        };
      }
      const index = indexOf(head, "letBindingValue");
      const binding = index === null ? undefined : chain.bindings[index];
      if (binding === undefined) {
        return undefined;
      }
      return {
        get: () => binding.value,
        set: (child) =>
          letChain(
            chain.bindings.map((b, i) =>
              i === index ? { ...b, value: child } : b,
            ),
            chain.body,
          ),
      };
    }
    case "function":
      return head === "functionBody" ? fieldLens("body") : undefined;
    case "call": {
      const index = indexOf(head, "callArgument");
      return index === null
        ? undefined
        : itemFieldLens(
            arrayAt(field(payload, "arguments")),
            index,
            "value",
            (args) => withPayload({ ...(payload as object), arguments: args }),
          );
    }
    case "list": {
      const index = indexOf(head, "listItemValue");
      const items = arrayAt(payload);
      if (index === null || index >= items.length) {
        return undefined;
      }
      return {
        get: () => items[index],
        set: (child) =>
          withPayload(items.map((item, i) => (i === index ? child : item))),
      };
    }
    case "record":
    case "type_record": {
      const index = indexOf(head, "recordItemValue");
      return index === null
        ? undefined
        : itemFieldLens(arrayAt(payload), index, "value", withPayload);
    }
    case "record_get":
      return head === "record" ? fieldLens("record") : undefined;
    case "variant":
      // ペイロードは option (`none` / `some(式)`)
      if (head !== "variantPayload") {
        return undefined;
      }
      return {
        get: () => optionValue(field(payload, "payload")),
        set: (child) =>
          withPayload({ ...(payload as object), payload: some(child) }),
      };
    case "match": {
      if (head === "matchTarget") {
        return fieldLens("target");
      }
      const index = indexOf(head, "matchArmBody");
      return index === null
        ? undefined
        : itemFieldLens(
            arrayAt(field(payload, "arms")),
            index,
            "body",
            (arms) => withPayload({ ...(payload as object), arms }),
          );
    }
    case "type_function": {
      if (head === "typeFunctionReturn") {
        return fieldLens("return_type");
      }
      const index = indexOf(head, "typeFunctionParameter");
      return index === null
        ? undefined
        : itemFieldLens(
            arrayAt(field(payload, "parameters")),
            index,
            "type",
            (parameters) => withPayload({ ...(payload as object), parameters }),
          );
    }
    case "type_union": {
      // バリアントのペイロードの型は option (`none` / `some(型)`)
      const index = indexOf(head, "typeUnionVariant");
      return index === null
        ? undefined
        : itemFieldLens(
            arrayAt(payload),
            index,
            "payload_type",
            withPayload,
            optionValue,
            some,
          );
    }
  }
  return undefined;
}

export function getExpressionAtPath(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): unknown | undefined {
  let current = expr;
  for (const step of path) {
    const lens = stepLens(current, step);
    if (lens === undefined) {
      return undefined;
    }
    current = lens.get();
  }
  return current;
}

export function updateExpressionAtPath(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  updater: (target: unknown) => unknown,
): unknown {
  const [head, ...tail] = path;
  if (head === undefined) {
    return updater(expr);
  }
  const lens = stepLens(expr, head);
  if (lens === undefined) {
    return expr;
  }
  return lens.set(updateExpressionAtPath(lens.get(), tail, updater));
}

export function setNumberValue(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  value: number,
): unknown {
  return updateExpressionAtPath(expr, path, () => numberExpression(value));
}

export function setStringValue(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  value: string,
): unknown {
  return updateExpressionAtPath(expr, path, () => stringExpression(value));
}

/** `path` の最後が関数の引数名 ({@link PathStep} の `functionParameter`) なら, その引数の番号 */
export function functionParameterIndex(
  path: ReadonlyArray<PathStep>,
): number | null {
  const last = path[path.length - 1];
  return typeof last === "object" && last.kind === "functionParameter"
    ? last.index
    : null;
}

/**
 * 関数の引数 (`path` は `functionParameter` で終わる) の名前を変える.
 * 本体の変数は ID で引数を参照しているので, 名前だけを変えればよい
 */
export function renameFunctionParameter(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
  name: string,
): unknown {
  const index = functionParameterIndex(path);
  if (index === null) {
    return expr;
  }
  return updateExpressionAtPath(expr, path.slice(0, -1), (target) => {
    const fn = variantOf(target);
    if (fn?.tag !== "function") {
      return target;
    }
    return variant("function", {
      ...(fn.payload as object),
      parameters: arrayAt(field(fn.payload, "parameters")).map(
        (parameter, i) =>
          i === index
            ? { ...(parameter as object), parameter_name: name }
            : parameter,
      ),
    });
  });
}

export function clearExpressionAtPath(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): unknown {
  return updateExpressionAtPath(expr, path, hole);
}
