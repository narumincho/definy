/**
 * パーツの定義の式を definy 製の評価器 (`core.eval-value`) で評価する
 * (docs/part-definition.md の「ユーザーが作った定義のパーツ」).
 *
 * `core.define-part` / `core.define-type` の呼び出しは src/part_definition.ts がその場で評価する.
 * ユーザーが作った定義のパーツ (`my.define-record-type(...)` など) の呼び出しは, コミットの中のパーツの式を使って
 * ここで評価する. 評価器は `npm run build:seeds` が stage1 でコンパイルした `wasm/definition_evaluator.wasm`
 * (Cloudflare Workers は実行時に Wasm をコンパイルできないので, サーバーとブラウザが同じものを使う)
 */
import { variant, variantOf } from "./definy_value.ts";
import {
  containsHole,
  instantiateCompiledFunction,
  isTypeDeclaration,
  type DefinyValue,
  type Stage1ReferencedPart,
} from "./stage1_compiler.ts";

/** `core.value` を, それが表す値 (stage1 でコンパイルして評価した結果と同じ形) にする. `core.value` でなければ例外を投げる */
export function coreValueToValue(value: unknown): unknown {
  const tagged = variantOf(value);
  if (tagged === undefined) {
    throw new Error(`Not a core.value: ${JSON.stringify(value)}`);
  }
  const payload = tagged.payload as DefinyValue;
  switch (tagged.tag) {
    case "number":
    case "float":
    case "string":
    case "boolean":
      return payload;
    case "list":
      return (payload as ReadonlyArray<DefinyValue>).map(coreValueToValue);
    case "record":
      return Object.fromEntries(
        (
          payload as ReadonlyArray<{
            readonly key: string;
            readonly value: DefinyValue;
          }>
        ).map((item) => [item.key, coreValueToValue(item.value)]),
      );
    case "variant": {
      const inner = payload as {
        readonly tag: string;
        readonly payload: DefinyValue;
      };
      return variant(
        inner.tag,
        variantOf(inner.payload)?.tag === "unit"
          ? null
          : coreValueToValue(inner.payload),
      );
    }
    case "unit":
      return null;
  }
  throw new Error(`Unexpected core.value: ${JSON.stringify(value)}`);
}

/**
 * 式の中の, `quote` の外にある `part_reference` の ID. quote の中の参照は評価しても読まない
 * (`core.code` の `part_ids` は式から求める) ので, 互いを quote する定義も評価できる
 */
export function evaluatedPartReferenceIds(
  expression: unknown,
): ReadonlyArray<string> {
  const references: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    const tagged = variantOf(value);
    if (tagged?.tag === "quote") {
      return;
    }
    if (tagged?.tag === "part_reference") {
      const id = (
        tagged.payload as {
          readonly part_definition_event_hash?: unknown;
        } | null
      )?.part_definition_event_hash;
      if (typeof id === "string") {
        references.push(id);
      }
    }
    Object.values(value).forEach(walk);
  };
  walk(expression);
  return references;
}

/**
 * 式を評価するのに要るパーツ (参照先をたどる. quote の中はたどらない). `resolve` で式が無いパーツは `unresolved`
 */
function partsForEvaluation(
  expression: unknown,
  resolve: (id: string) => unknown,
): {
  readonly parts: ReadonlyArray<Stage1ReferencedPart>;
  readonly unresolved: ReadonlyArray<string>;
} {
  const queue = [...evaluatedPartReferenceIds(expression)];
  const seen = new Set<string>();
  const parts: Stage1ReferencedPart[] = [];
  const unresolved: string[] = [];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const partExpression = resolve(id);
    if (partExpression == null || containsHole(partExpression)) {
      unresolved.push(id);
      continue;
    }
    parts.push({ id, expression: partExpression });
    // 型パーツは実行時には参照のままの値になるので, 宣言の中の参照はたどらない
    if (!isTypeDeclaration(partExpression)) {
      queue.push(...evaluatedPartReferenceIds(partExpression));
    }
  }
  return { parts, unresolved };
}

/**
 * 定義の式 `definition` を `core.eval-value` で評価した値. 参照するパーツの式は `resolve` で引く.
 * 評価できなければ (参照するパーツが無い, 評価器が trap した) `undefined`
 */
export function evaluateDefinition(
  evaluator: WebAssembly.Module,
  definition: unknown,
  resolve: (id: string) => unknown,
): unknown {
  const { parts, unresolved } = partsForEvaluation(definition, resolve);
  if (unresolved.length > 0 || containsHole(definition)) {
    return undefined;
  }
  try {
    const instance = instantiateCompiledFunction(evaluator);
    const result = instance.call({
      expr: instance.writeArgument(definition),
      env: instance.writeArgument([]),
      parts: instance.writeArgument(
        parts.map((part) => ({ id: part.id, expression: part.expression })),
      ),
    });
    return coreValueToValue(instance.read(result));
  } catch {
    return undefined;
  }
}
