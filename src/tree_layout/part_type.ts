/**
 * パーツの型 (`partType`, seeds/schemas の `PartType`) と, 型のツリーエディタで扱う型の式の相互変換.
 *
 * 型の行は式のツリーエディタ (ExpressionTreeEditor の mode="type") をそのまま使うので,
 * 型を式 (`TypeNumber`, `TypeList`, `TypeFunction` ...) にして編集し, 保存のときに戻す.
 *
 * | partType                                  | 型の式                                                   |
 * | ----------------------------------------- | -------------------------------------------------------- |
 * | `"number"` / `"string"` / `"boolean"`     | `"TypeNumber"` / `"TypeString"` / `"TypeBoolean"`        |
 * | `"type"`                                  | `"TypeType"`                                             |
 * | `"secret"`                                | `"TypeSecret"`                                           |
 * | `{ list: T }`                             | `{ TypeList: { item_type: T } }`                         |
 * | `{ code: T }`                             | `{ TypeCode: { value_type: T } }`                        |
 * | `{ function: { parameters, return_type }}` | `{ TypeFunction: { parameters: [{ name, type }], return_type } }` |
 * | `{ record: [{ key, value }] }`            | `{ TypeLiteral: { items: [{ key, value }] } }`           |
 * | `{ union: [{ tag, payload }] }`           | `{ TypeUnion: { variants: [{ tag, payload_type }] } }`   |
 * | `{ type_part: H }`                        | `{ PartReference: { part_definition_event_hash: H } }`   |
 * | `null` (型指定なし)                       | `null`                                                   |
 *
 * 未入力 (`Hole`) は `null` に戻す. 知らない形はそのまま `{ UnknownPartType: 値 }` で包んで往復させる
 */

const SIMPLE_TYPES: ReadonlyArray<readonly [string, string]> = [
  ["number", "TypeNumber"],
  ["string", "TypeString"],
  ["boolean", "TypeBoolean"],
  ["type", "TypeType"],
  ["secret", "TypeSecret"],
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayOf(value: unknown): ReadonlyArray<Record<string, unknown>> {
  return Array.isArray(value) ? value.map((v) => asRecord(v) ?? {}) : [];
}

export function partTypeToExpression(partType: unknown): unknown {
  if (partType === null || partType === undefined) {
    return null;
  }
  if (typeof partType === "string") {
    const found = SIMPLE_TYPES.find(([t]) => t === partType);
    return found ? found[1] : { UnknownPartType: partType };
  }
  const obj = asRecord(partType);
  if (obj === null) {
    return { UnknownPartType: partType };
  }
  if ("list" in obj) {
    return { TypeList: { item_type: partTypeToExpression(obj.list) } };
  }
  if ("code" in obj) {
    return { TypeCode: { value_type: partTypeToExpression(obj.code) } };
  }
  if ("function" in obj) {
    const fn = asRecord(obj.function) ?? {};
    return {
      TypeFunction: {
        parameters: arrayOf(fn.parameters).map((p) => ({
          name: String(p.name ?? ""),
          type: partTypeToExpression(p.type),
        })),
        return_type: partTypeToExpression(fn.return_type),
      },
    };
  }
  if ("record" in obj) {
    return {
      TypeLiteral: {
        items: arrayOf(obj.record).map((f) => ({
          key: String(f.key ?? ""),
          value: partTypeToExpression(f.value),
        })),
      },
    };
  }
  if ("union" in obj) {
    return {
      TypeUnion: {
        variants: arrayOf(obj.union).map((v) => ({
          tag: String(v.tag ?? ""),
          payload_type:
            v.payload == null ? null : partTypeToExpression(v.payload),
        })),
      },
    };
  }
  if ("type_part" in obj) {
    return { PartReference: { part_definition_event_hash: obj.type_part } };
  }
  return { UnknownPartType: partType };
}

export function expressionToPartType(expression: unknown): unknown {
  if (expression === null || expression === undefined) {
    return null;
  }
  if (typeof expression === "string") {
    const found = SIMPLE_TYPES.find(([, e]) => e === expression);
    return found ? found[0] : null;
  }
  const obj = asRecord(expression);
  if (obj === null || "Hole" in obj) {
    return null;
  }
  if ("UnknownPartType" in obj) {
    return obj.UnknownPartType;
  }
  if ("TypeList" in obj) {
    return {
      list: expressionToPartType(asRecord(obj.TypeList)?.item_type),
    };
  }
  if ("TypeCode" in obj) {
    return {
      code: expressionToPartType(asRecord(obj.TypeCode)?.value_type),
    };
  }
  if ("TypeFunction" in obj) {
    const fn = asRecord(obj.TypeFunction) ?? {};
    return {
      function: {
        parameters: arrayOf(fn.parameters).map((p) => ({
          name: String(p.name ?? ""),
          type: expressionToPartType(p.type),
        })),
        return_type: expressionToPartType(fn.return_type),
      },
    };
  }
  if ("TypeLiteral" in obj) {
    return {
      record: arrayOf(asRecord(obj.TypeLiteral)?.items).map((f) => ({
        key: String(f.key ?? ""),
        value: expressionToPartType(f.value),
      })),
    };
  }
  if ("TypeUnion" in obj) {
    return {
      union: arrayOf(asRecord(obj.TypeUnion)?.variants).map((v) => ({
        tag: String(v.tag ?? ""),
        payload:
          v.payload_type == null ? null : expressionToPartType(v.payload_type),
      })),
    };
  }
  if ("PartReference" in obj) {
    return {
      type_part: asRecord(obj.PartReference)?.part_definition_event_hash,
    };
  }
  return null;
}

/** 式の根が関数なら, その引数名の一覧 */
function rootParameterNames(
  expression: unknown,
): ReadonlyArray<unknown> | null {
  const fn = (expression as { readonly Function?: unknown } | null)
    ?.Function as
    | {
        readonly parameters?: ReadonlyArray<{
          readonly parameter_name?: unknown;
        }>;
      }
    | undefined;
  return fn?.parameters?.map((parameter) => parameter.parameter_name) ?? null;
}

/**
 * 式の根の関数の引数名が `before` から `after` で変わったら, 関数のパーツの型の同じ位置の引数名も変えた型を返す.
 * 呼び出し側は引数をパーツの型の引数名で渡すので, 型の引数名と式の引数名を揃えておく.
 * 変わっていなければ `undefined`
 */
export function syncPartTypeParameterNames(
  partType: unknown,
  before: unknown,
  after: unknown,
): unknown {
  const beforeNames = rootParameterNames(before);
  const afterNames = rootParameterNames(after);
  const fn = (partType as { readonly function?: unknown } | null)?.function as
    | {
        readonly parameters?: ReadonlyArray<Readonly<Record<string, unknown>>>;
      }
    | undefined;
  if (
    beforeNames === null ||
    afterNames === null ||
    fn?.parameters === undefined ||
    beforeNames.length !== afterNames.length ||
    beforeNames.every((name, i) => name === afterNames[i])
  ) {
    return undefined;
  }
  return {
    function: {
      ...fn,
      parameters: fn.parameters.map((parameter, i) =>
        beforeNames[i] !== afterNames[i] && typeof afterNames[i] === "string"
          ? { ...parameter, name: afterNames[i] }
          : parameter,
      ),
    },
  };
}
