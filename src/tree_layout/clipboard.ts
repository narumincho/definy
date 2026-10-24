/**
 * 式のツリーエディタのコピー・切り取り・貼り付け (docs/ui.md「コピー・貼り付け」).
 *
 * OS のクリップボードに `text/plain` の JSON ({@link ExpressionClipboardData}) として書くので,
 * 別のブラウザ・別のタブの definy にも貼り付けられる.
 * DOM に依存しない純粋な関数にしてテストできるようにしている.
 */
import { nextVariableId } from "./selection.ts";
import { getExpressionAtPath, updateExpressionAtPath } from "./path.ts";
import type { PathStep } from "./types.ts";
import type { SelectorOption } from "./selector_options.ts";

/** クリップボードの JSON の `format` の値. これが無い文字列は貼り付けない */
export const EXPRESSION_CLIPBOARD_FORMAT = "definy.expression";

/** 置換メニューの選択肢の value */
export const CLIPBOARD_COPY = "clipboard:copy";
export const CLIPBOARD_CUT = "clipboard:cut";
export const CLIPBOARD_PASTE = "clipboard:paste";

export function isClipboardAction(value: string): boolean {
  return value.startsWith("clipboard:");
}

export type ExpressionClipboardData = {
  readonly format: typeof EXPRESSION_CLIPBOARD_FORMAT;
  readonly version: 1;
  /** 式のツリーエディタ (`expression`) か, パーツの型のツリーエディタ (`type`) か. 違う種類には貼り付けない */
  readonly mode: "expression" | "type";
  readonly expression: unknown;
  /**
   * コピーした式の中で定義されずに参照している変数 (外側の let・関数の引数など) の ID と名前.
   * 貼り付け先では同じ名前の変数に付け替える
   */
  readonly freeVariables: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
  }>;
};

/** `{"Variable": {"variable_id": n}}` か `{"Variable": n}` なら, その変数 ID */
function referencedId(value: unknown): number | null {
  if (value === null || typeof value !== "object" || !("Variable" in value)) {
    return null;
  }
  const raw = (value as { readonly Variable: unknown }).Variable;
  const id =
    typeof raw === "number"
      ? raw
      : (raw as { readonly variable_id?: unknown } | null)?.variable_id;
  return typeof id === "number" && Number.isInteger(id) ? id : null;
}

/** 式の中で定義している変数 ID (let の束縛, 関数の引数, match の束縛) と, 参照している変数 ID */
function collectVariableIds(expr: unknown): {
  readonly bound: ReadonlySet<number>;
  readonly referenced: ReadonlySet<number>;
} {
  const bound = new Set<number>();
  const referenced = new Set<number>();
  function walk(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object" || value instanceof Uint8Array) {
      return;
    }
    const id = referencedId(value);
    if (id !== null) {
      referenced.add(id);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (
        (key === "variable_id" || key === "parameter_id") &&
        typeof child === "number"
      ) {
        bound.add(child);
      } else {
        walk(child);
      }
    }
  }
  walk(expr);
  return { bound, referenced };
}

/**
 * `path` の位置の式をクリップボードに書く JSON 文字列にする. `scopeVariables` はその位置から参照できる変数 (ID → 名前).
 * 式でない位置 (変数名・パターンなど) なら `null`
 */
export function expressionToClipboardText(
  rootExpr: unknown,
  path: ReadonlyArray<PathStep>,
  scopeVariables: ReadonlyMap<number, string> | undefined,
  mode: "expression" | "type",
): string | null {
  const expression = getExpressionAtPath(rootExpr, path);
  if (expression === undefined) {
    return null;
  }
  const { bound, referenced } = collectVariableIds(expression);
  const data: ExpressionClipboardData = {
    format: EXPRESSION_CLIPBOARD_FORMAT,
    version: 1,
    mode,
    expression,
    freeVariables: [...referenced]
      .filter((id) => !bound.has(id))
      .map((id) => ({ id, name: scopeVariables?.get(id) ?? "" })),
  };
  // パーツの ID などのバイト列は JSON にできないので `{"$bytes": "<Base64URL>"}` にする
  return JSON.stringify(data, (_key, value: unknown) =>
    value instanceof Uint8Array
      ? { $bytes: value.toBase64({ alphabet: "base64url", omitPadding: true }) }
      : value,
  );
}

/** クリップボードの文字列を読む. definy の式でなければ `null` */
export function parseClipboardText(
  text: string,
): ExpressionClipboardData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text, (_key, value: unknown) => {
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length === 1 &&
        typeof (value as { $bytes?: unknown }).$bytes === "string"
      ) {
        return Uint8Array.fromBase64((value as { $bytes: string }).$bytes, {
          alphabet: "base64url",
        });
      }
      return value;
    });
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") {
    return null;
  }
  const data = parsed as Partial<
    Record<keyof ExpressionClipboardData, unknown>
  >;
  if (
    data.format !== EXPRESSION_CLIPBOARD_FORMAT ||
    data.version !== 1 ||
    (data.mode !== "expression" && data.mode !== "type") ||
    data.expression === null ||
    typeof data.expression !== "object" ||
    !Array.isArray(data.freeVariables)
  ) {
    return null;
  }
  return {
    format: EXPRESSION_CLIPBOARD_FORMAT,
    version: 1,
    mode: data.mode,
    expression: data.expression,
    freeVariables: data.freeVariables.flatMap((v: unknown) => {
      const { id, name } = (v ?? {}) as { id?: unknown; name?: unknown };
      return typeof id === "number" && typeof name === "string"
        ? [{ id, name }]
        : [];
    }),
  };
}

/**
 * 貼り付ける式の変数 ID を貼り付け先に合わせる.
 *
 * - 式の中で定義する変数は, 貼り付け先の式全体で使われていない ID に振り直す (外側の変数と ID がぶつからないように)
 * - 式の外の変数は, 貼り付け先から参照できる同じ名前の変数に付け替える. 同じ ID で同じ名前ならそのまま.
 *   見つからなければ未入力 (`Hole`) にする (その変数の呼び出しなら呼び出しごと未入力にする)
 */
export function remapPastedVariables(
  data: ExpressionClipboardData,
  firstFreshId: number,
  scopeVariables: ReadonlyMap<number, string> | undefined,
): unknown {
  const { bound } = collectVariableIds(data.expression);
  const idMap = new Map<number, number | null>();
  let fresh = firstFreshId;
  for (const id of [...bound].sort((a, b) => a - b)) {
    idMap.set(id, fresh++);
  }
  // 名前から貼り付け先の変数. 内側の変数ほど後に入っているので後のものを優先する
  const idByName = new Map<string, number>();
  for (const [id, name] of scopeVariables ?? []) {
    idByName.set(name, id);
  }
  for (const { id, name } of data.freeVariables) {
    if (bound.has(id)) continue;
    idMap.set(
      id,
      scopeVariables?.get(id) === name ? id : (idByName.get(name) ?? null),
    );
  }

  function rewrite(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(rewrite);
    }
    if (!value || typeof value !== "object" || value instanceof Uint8Array) {
      return value;
    }
    const ref = referencedId(value);
    if (ref !== null) {
      const mapped = idMap.has(ref) ? idMap.get(ref) : ref;
      return mapped === null || mapped === undefined
        ? { Hole: {} }
        : { Variable: { variable_id: mapped } };
    }
    if ("Call" in value) {
      const callee = (
        value as { readonly Call?: { readonly function?: unknown } }
      ).Call?.function;
      const calleeId = referencedId(callee);
      if (calleeId !== null && idMap.get(calleeId) === null) {
        return { Hole: {} };
      }
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        (key === "variable_id" || key === "parameter_id") &&
        typeof child === "number"
          ? (idMap.get(child) ?? child)
          : rewrite(child),
      ]),
    );
  }
  return rewrite(data.expression);
}

/**
 * `path` の位置の式をクリップボードの式に置き換える. `scopeVariables` は貼り付け先から参照できる変数 (ID → 名前).
 * 種類 (式と型) が違えば `null`
 */
export function pasteExpressionAt(
  rootExpr: unknown,
  path: ReadonlyArray<PathStep>,
  data: ExpressionClipboardData,
  scopeVariables: ReadonlyMap<number, string> | undefined,
  mode: "expression" | "type",
): unknown {
  if (data.mode !== mode || getExpressionAtPath(rootExpr, path) === undefined) {
    return null;
  }
  const pasted = remapPastedVariables(
    data,
    nextVariableId(rootExpr),
    scopeVariables,
  );
  return updateExpressionAtPath(rootExpr, path, () => pasted);
}

/** 置換メニューに出すコピー・切り取り・貼り付けの選択肢 (式を選んだときだけ. メニューはそもそも編集できるときだけ開く) */
export function clipboardSelectorOptions(): ReadonlyArray<SelectorOption> {
  const action = (value: string, name: string, detail: string) => ({
    value,
    name,
    detail,
    category: "Clipboard",
    returnType: "any" as const,
  });
  return [
    action(CLIPBOARD_COPY, "copy", "Ctrl+C"),
    action(CLIPBOARD_CUT, "cut", "Ctrl+X"),
    action(CLIPBOARD_PASTE, "paste", "Ctrl+V"),
  ];
}
