/**
 * パーツの定義の式 (docs/part-definition.md).
 *
 * CAS に預けるパーツの中身は, 評価すると `core.part-content` の値になる `core.expression` の値
 * (`core.define-part(...)` や `core.define-type(...)` の呼び出し). パーツの名前は式の外 (コミット) に置く.
 *
 * 読むときは式を評価する. ここでは評価器を動かさず, 定義の式に書ける形 (リテラル, `quote(e).expression`,
 * `core.define-part` / `core.define-type` の呼び出し) だけをその場で評価する. 結果が stage1 で評価したものと同じことは
 * src/part_definition.test.ts で確かめている
 */
import { deriveModuleIdBytes, deriveModulePartId } from "./part_ids.ts";
import {
  field,
  optionValue,
  variantOf,
  VARIANT_PREFIX,
} from "./definy_value.ts";
import {
  encodePartContent,
  isPartContent,
  partContentFromValue,
  type PartContent,
} from "./event_content.ts";

let definitionPartIds:
  | {
      readonly definePart: string;
      readonly defineType: string;
      readonly partContent: string;
    }
  | undefined;

/** `core.define-part` と `core.define-type`, 定義の式の型 `core.part-content` のパーツ ID */
export function definitionPartIdsOf(): {
  readonly definePart: string;
  readonly defineType: string;
  readonly partContent: string;
} {
  if (definitionPartIds === undefined) {
    // cbor.ts は event_content.ts を読み込むので, モジュールを読み込むときではなく使うときに求める
    const core = deriveModuleIdBytes("core");
    definitionPartIds = {
      definePart: deriveModulePartId(core, "define-part"),
      defineType: deriveModulePartId(core, "define-type"),
      partContent: deriveModulePartId(core, "part-content"),
    };
  }
  return definitionPartIds;
}

const NONE = { "#none": null };

/** 定義の式の型 `core.part-content` (型の式). エディタで定義の式を編集するときのパーツの型にする */
export function partDefinitionType(): unknown {
  return partReference(definitionPartIdsOf().partContent);
}

function partReference(id: string): unknown {
  return { "#part_reference": { part_definition_event_hash: id } };
}

function callOf(id: string, args: Readonly<Record<string, unknown>>): unknown {
  return {
    "#call": {
      function: partReference(id),
      arguments: Object.entries(args).map(([name, value]) => ({
        name,
        value,
      })),
    },
  };
}

/**
 * definy の値 (docs/value-encoding.md) を, 評価するとその値になる式にする.
 * タグ付きの値は型パーツを指定しない Variant (`type_part: none`) にする
 */
export function literalExpression(value: unknown): unknown {
  switch (typeof value) {
    case "string":
      return { "#string": value };
    case "boolean":
      return { "#boolean": value };
    case "number":
      if (!Number.isSafeInteger(value)) {
        throw new Error(`cannot write ${value} as a number literal`);
      }
      return { "#number": value };
  }
  if (Array.isArray(value)) {
    return { "#list": value.map(literalExpression) };
  }
  if (typeof value !== "object" || value === null) {
    throw new Error(`cannot write ${String(value)} as a literal`);
  }
  const tagged = variantOf(value);
  if (tagged !== undefined) {
    return {
      "#variant": {
        tag: tagged.tag,
        payload:
          tagged.payload === null
            ? NONE
            : { "#some": literalExpression(tagged.payload) },
        type_part: NONE,
      },
    };
  }
  return {
    "#record": Object.entries(value).map(([key, item]) => ({
      key,
      value: literalExpression(item),
    })),
  };
}

/** 評価すると式 `expression` の値 (`core.expression`) になる式 `quote(expression).expression` */
function quotedExpression(expression: unknown): unknown {
  return {
    "#record_get": { record: { "#quote": expression }, key: "expression" },
  };
}

/** 型の式 `type` */
const TYPE_TYPE = { "#type_type": null };

/** パーツの型 (型の式) が `type` (型パーツ) か */
function isTypeType(partType: unknown): boolean {
  return variantOf(partType)?.tag === "type_type";
}

/**
 * パーツの中身の定義の式. 型パーツ (型が `type` で式がある) なら `core.define-type(...)`,
 * それ以外は `core.define-part(...)`. 同じ中身からは常に同じ式を作る (content hash が変わらない)
 */
export function partDefinitionExpression(content: PartContent): unknown {
  const encoded = encodePartContent(content) as Readonly<
    Record<string, unknown>
  >;
  const ids = definitionPartIdsOf();
  if (isTypeType(content.partType) && content.expression !== null) {
    return callOf(ids.defineType, {
      description: literalExpression(encoded.description),
      visibility: literalExpression(encoded.visibility),
      expression: quotedExpression(content.expression),
    });
  }
  return callOf(ids.definePart, {
    description: literalExpression(encoded.description),
    visibility: literalExpression(encoded.visibility),
    part_type: optionalQuotedExpression(optionValue(encoded.part_type)),
    expression: optionalQuotedExpression(content.expression ?? undefined),
  });
}

/** 式が無ければ `none`, あれば `some(quote(expression).expression)` */
function optionalQuotedExpression(expression: unknown): unknown {
  return expression === undefined
    ? literalExpression(NONE)
    : {
        "#variant": {
          tag: "some",
          payload: { "#some": quotedExpression(expression) },
          type_part: NONE,
        },
      };
}

/** 評価できない式 */
const UNSUPPORTED = Symbol("unsupported");

function evaluate(expression: unknown): unknown {
  const tagged = variantOf(expression);
  if (tagged === undefined) {
    return UNSUPPORTED;
  }
  const { tag, payload } = tagged;
  switch (tag) {
    case "number":
    case "string":
    case "boolean":
      return typeof payload === tag ? payload : UNSUPPORTED;
    case "list": {
      if (!Array.isArray(payload)) {
        return UNSUPPORTED;
      }
      const items = payload.map(evaluate);
      return items.includes(UNSUPPORTED) ? UNSUPPORTED : items;
    }
    case "record": {
      if (!Array.isArray(payload)) {
        return UNSUPPORTED;
      }
      const record: Record<string, unknown> = {};
      for (const item of payload) {
        const key = field(item, "key");
        const value = evaluate(field(item, "value"));
        if (
          typeof key !== "string" ||
          key.startsWith(VARIANT_PREFIX) ||
          Object.hasOwn(record, key) ||
          value === UNSUPPORTED
        ) {
          return UNSUPPORTED;
        }
        record[key] = value;
      }
      return record;
    }
    case "variant": {
      const variantTag = field(payload, "tag");
      const optionalPayload = variantOf(field(payload, "payload"));
      if (typeof variantTag !== "string" || optionalPayload === undefined) {
        return UNSUPPORTED;
      }
      if (optionalPayload.tag === "none") {
        return { [VARIANT_PREFIX + variantTag]: null };
      }
      const value = evaluate(optionalPayload.payload);
      return optionalPayload.tag !== "some" || value === UNSUPPORTED
        ? UNSUPPORTED
        : { [VARIANT_PREFIX + variantTag]: value };
    }
    case "record_get": {
      // quote(e).expression は e (quote の値 core.code の expression). part_ids は求めない
      const quoted = variantOf(field(payload, "record"));
      return quoted?.tag === "quote" &&
        field(payload, "key") === "expression" &&
        quoted.payload !== null
        ? quoted.payload
        : UNSUPPORTED;
    }
    case "call":
      return evaluateDefinitionCall(payload);
  }
  return UNSUPPORTED;
}

/** `core.define-part` / `core.define-type` の呼び出しを評価する (seeds/core.json の 2 つの式と同じ) */
function evaluateDefinitionCall(call: unknown): unknown {
  const callee = variantOf(field(call, "function"));
  const id =
    callee?.tag === "part_reference"
      ? field(callee.payload, "part_definition_event_hash")
      : undefined;
  const ids = definitionPartIdsOf();
  const parameterNames =
    id === ids.definePart
      ? ["description", "visibility", "part_type", "expression"]
      : id === ids.defineType
        ? ["description", "visibility", "expression"]
        : undefined;
  const callArguments = field(call, "arguments");
  if (parameterNames === undefined || !Array.isArray(callArguments)) {
    return UNSUPPORTED;
  }
  const args = new Map<string, unknown>();
  for (const argument of callArguments) {
    const name = field(argument, "name");
    const value = evaluate(field(argument, "value"));
    if (
      typeof name !== "string" ||
      !parameterNames.includes(name) ||
      args.has(name) ||
      value === UNSUPPORTED
    ) {
      return UNSUPPORTED;
    }
    args.set(name, value);
  }
  if (args.size !== parameterNames.length) {
    return UNSUPPORTED;
  }
  return id === ids.definePart
    ? {
        description: args.get("description"),
        visibility: args.get("visibility"),
        part_type: args.get("part_type"),
        expression: args.get("expression"),
      }
    : {
        description: args.get("description"),
        visibility: args.get("visibility"),
        part_type: { "#some": TYPE_TYPE },
        expression: { "#some": args.get("expression") },
      };
}

/**
 * パーツの定義の式を評価して `core.part-content` の値 (形は確かめていない) にする.
 * ここで評価できない形の式なら `undefined`
 */
export function evaluatePartDefinition(definition: unknown): unknown {
  const value = evaluate(definition);
  return value === UNSUPPORTED ? undefined : value;
}

/** パーツの定義の式を評価してパーツの中身にする. 評価できないか, 結果が `core.part-content` の形でなければ `undefined` */
export function decodePartDefinition(
  definition: unknown,
): PartContent | undefined {
  const value = evaluatePartDefinition(definition);
  return value !== undefined && isPartContent(value)
    ? partContentFromValue(value)
    : undefined;
}

/** 定義の式を評価する関数 (src/definition_evaluator.ts の `evaluateDefinition` に評価器を渡したもの) */
export type DefinitionEvaluator = (
  definition: unknown,
  resolve: (id: string) => unknown,
) => unknown;

/**
 * コミットのパーツの中身を, 定義の式から求める (キーはパーツ ID).
 * `core.define-part` / `core.define-type` の呼び出しはその場で評価し ({@link decodePartDefinition}),
 * それ以外 (ユーザーが作った定義のパーツの呼び出しなど) は `evaluate` でコミットの中で評価する.
 * 評価で参照するパーツの式は, コミットのパーツなら求めた中身の式, そうでなければ `external` で引く.
 * 中身の求まったパーツを使って繰り返し評価するので, 定義のパーツ自体を定義のパーツで定義してもよい.
 * 評価できない (`evaluate` が無い, 循環している, `core.part-content` にならない) パーツは入らない.
 * その場で評価できて `core.part-content` にならないものは評価器でも評価しない
 */
export function resolveDefinitionsInCommit(options: {
  readonly definitions: ReadonlyMap<string, unknown>;
  readonly external: (id: string) => unknown;
  readonly evaluate: DefinitionEvaluator | undefined;
  /** 評価した値がパーツ `id` の中身 (`core.part-content`) の形か. 省くと {@link isPartContent} */
  readonly conforms?: (id: string, value: unknown) => boolean;
}): ReadonlyMap<string, PartContent> {
  const conforms =
    options.conforms ?? ((_: string, value: unknown) => isPartContent(value));
  const contents = new Map<string, PartContent>();
  let pending: Array<readonly [string, unknown]> = [];
  for (const [id, definition] of options.definitions) {
    const value = evaluatePartDefinition(definition);
    if (value !== undefined && conforms(id, value)) {
      contents.set(id, partContentFromValue(value));
    } else if (value === undefined) {
      pending.push([id, definition]);
    }
  }
  const evaluate = options.evaluate;
  if (evaluate === undefined) {
    return contents;
  }
  const resolve = (id: string): unknown =>
    options.definitions.has(id)
      ? (contents.get(id)?.expression ?? undefined)
      : options.external(id);
  for (let progress = true; progress && pending.length > 0;) {
    progress = false;
    const next: Array<readonly [string, unknown]> = [];
    for (const [id, definition] of pending) {
      const value = evaluate(definition, resolve);
      if (value !== undefined && conforms(id, value)) {
        contents.set(id, partContentFromValue(value));
        progress = true;
      } else {
        next.push([id, definition]);
      }
    }
    pending = next;
  }
  return contents;
}
