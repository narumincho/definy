/**
 * 評価器の値 (`core.value`) を型の付いた値にする definy のパーツ (`core.value-to-*`) を, 型パーツの宣言から作って
 * `seeds/core.json` に書く (docs/value-decoder.md).
 *
 * `node scripts/generate_value_decoders.ts` で書き換え, `--check` で seeds と同じか確かめる (違えば終了コード 1).
 * 型パーツ (`core.expression` など) の形を変えたら実行する. `src/value_decoders.test.ts` も seeds と比べる
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type Json = unknown;

type SeedPart = {
  readonly name: string;
  readonly part_type: Json;
  readonly description: ReadonlyArray<{
    readonly language: string;
    readonly text: string;
  }>;
  readonly expression?: Json;
};

type SeedModule = {
  readonly $schema?: string;
  readonly module_name: string;
  readonly module_description?: Json;
  readonly parts: ReadonlyArray<SeedPart>;
};

/** 中身を `core.value` から読む型パーツ. `core.part-content` から参照をたどったもの */
export const VALUE_DECODER_TYPES: ReadonlyArray<string> = [
  "part-content",
  "localized-text",
  "visibility",
  "expression",
  "callee",
  "match-arm",
  "pattern",
];

/** リストを読む補助のパーツの名前 */
const LIST_HELPER = "value-to-list";

/**
 * 読んだ結果に型を付ける補助のパーツの名前. `match` の対象のように期待する型の無い位置では `#some(x)` / `#none` の型が
 * 決まらないので, 型引数で `option<T>` の型を付ける
 */
const TYPED_HELPER = "value-decoded";

export const decoderName = (typeName: string): string => `value-to-${typeName}`;

const part = (name: string): Json => ({ $part: `core.${name}` });
const ref = (name: string): Json => ({
  "#part_reference": { part_definition_event_hash: part(name) },
});
const variable = (id: number): Json => ({ "#variable": { variable_id: id } });
const call = (
  fn: Json,
  args: ReadonlyArray<readonly [string, Json]>,
): Json => ({
  "#call": {
    function: fn,
    arguments: args.map(([name, value]) => ({ name, value })),
  },
});
const lambda = (
  parameters: ReadonlyArray<readonly [number, string]>,
  body: Json,
): Json => ({
  "#function": {
    parameters: parameters.map(([id, name]) => ({
      parameter_id: id,
      parameter_name: name,
    })),
    body,
  },
});
const match = (
  target: Json,
  arms: ReadonlyArray<readonly [Json, Json]>,
): Json => ({
  "#match": {
    target,
    arms: arms.map(([pattern, body]) => ({ pattern, body })),
  },
});
const tagged = (
  tag: string,
  payload: Json | undefined,
  typePart?: string,
): Json => ({
  "#variant": {
    tag,
    payload: payload === undefined ? { "#none": null } : { "#some": payload },
    type_part:
      typePart === undefined ? { "#none": null } : { "#some": part(typePart) },
  },
});
const some = (value: Json): Json => tagged("some", value);
const none = (): Json => tagged("none", undefined);
const bindVariant = (tag: string, id: number, name: string): Json => ({
  "#variant": {
    tag,
    payload: { "#bind": { variable_id: id, variable_name: name } },
  },
});
const anyPattern: Json = { "#any": null };
const optionType = (type: Json): Json => ({
  "#type_union": [
    { tag: "none", payload_type: { "#none": null } },
    { tag: "some", payload_type: { "#some": type } },
  ],
});
const VALUE_TYPE = ref("value");

function only(value: Json): readonly [string, Json] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`not a variant: ${JSON.stringify(value)}`);
  }
  const entries = Object.entries(value);
  if (entries.length !== 1 || !entries[0]![0].startsWith("#")) {
    throw new Error(`not a variant: ${JSON.stringify(value)}`);
  }
  return [entries[0]![0].slice(1), entries[0]![1]];
}

/** 型パーツの参照の名前 (`core.x` の `x`) */
function referencedTypeName(payload: Json): string {
  const hash = (payload as { readonly part_definition_event_hash?: Json })
    .part_definition_event_hash as { readonly $part?: unknown } | undefined;
  const name = hash?.$part;
  if (typeof name !== "string" || !name.startsWith("core.")) {
    throw new Error(`not a core part reference: ${JSON.stringify(payload)}`);
  }
  return name.slice("core.".length);
}

/**
 * `value` (`core.value` の式) を型 `type` の値として読む式 (型は `option<type>`). `unionPart` は `type` が型パーツの
 * 直和型の宣言そのものならそのパーツの名前 (作るバリアントに型パーツを付ける)
 */
function decoderExpression(
  type: Json,
  value: Json,
  fresh: () => number,
  unionPart?: string,
): Json {
  const [kind, payload] = only(type);
  const primitive = (valueTag: string): Json => {
    const id = fresh();
    return match(value, [
      [bindVariant(valueTag, id, "v"), some(variable(id))],
      [anyPattern, none()],
    ]);
  };
  switch (kind) {
    case "type_number":
      return primitive("number");
    case "type_string":
      return primitive("string");
    case "type_boolean":
      return primitive("boolean");
    case "type_float":
      return primitive("float");
    case "type_list": {
      const itemType = (payload as { readonly item_type: Json }).item_type;
      const items = fresh();
      const item = fresh();
      return match(value, [
        [
          bindVariant("list", items, "items"),
          call(ref(LIST_HELPER), [
            ["T", itemType],
            ["items", variable(items)],
            [
              "decode",
              lambda(
                [[item, "value"]],
                decoderExpression(itemType, variable(item), fresh),
              ),
            ],
            ["index", { "#number": 0 }],
            ["acc", { "#list": [] }],
          ]),
        ],
        [anyPattern, none()],
      ]);
    }
    case "type_record": {
      const fields = payload as ReadonlyArray<{
        readonly key: string;
        readonly value: Json;
      }>;
      const fieldsId = fresh();
      const decoded: Array<readonly [string, number]> = [];
      const build = (index: number): Json => {
        if (index === fields.length) {
          return some({
            "#record": decoded.map(([key, id]) => ({
              key,
              value: variable(id),
            })),
          });
        }
        const field = fields[index]!;
        const raw = fresh();
        const result = fresh();
        decoded.push([field.key, result]);
        return match(
          call(ref("value-record-field"), [
            ["fields", variable(fieldsId)],
            ["key", { "#string": field.key }],
            ["index", { "#number": 0 }],
          ]),
          [
            [
              bindVariant("some", raw, "field"),
              match(typedDecoder(field.value, variable(raw), fresh), [
                [bindVariant("some", result, field.key), build(index + 1)],
                [anyPattern, none()],
              ]),
            ],
            [anyPattern, none()],
          ],
        );
      };
      return match(value, [
        [bindVariant("record", fieldsId, "fields"), build(0)],
        [anyPattern, none()],
      ]);
    }
    case "type_union": {
      const variants = payload as ReadonlyArray<{
        readonly tag: string;
        readonly payload_type: Json;
      }>;
      const variantId = fresh();
      const tagArm = (variantType: (typeof variants)[number]): Json => {
        const [payloadKind, payloadType] = only(variantType.payload_type);
        if (payloadKind === "none") {
          return some(tagged(variantType.tag, undefined, unionPart));
        }
        const result = fresh();
        return match(
          typedDecoder(
            payloadType,
            { "#record_get": { record: variable(variantId), key: "payload" } },
            fresh,
          ),
          [
            [
              bindVariant("some", result, "payload"),
              some(tagged(variantType.tag, variable(result), unionPart)),
            ],
            [anyPattern, none()],
          ],
        );
      };
      return match(value, [
        [
          bindVariant("variant", variantId, "variant"),
          match(
            { "#record_get": { record: variable(variantId), key: "tag" } },
            [
              ...variants.map(
                (variantType) =>
                  [
                    { "#string": variantType.tag },
                    tagArm(variantType),
                  ] as const,
              ),
              [anyPattern, none()],
            ],
          ),
        ],
        [anyPattern, none()],
      ]);
    }
    case "part_reference": {
      const name = referencedTypeName(payload);
      if (!VALUE_DECODER_TYPES.includes(name)) {
        throw new Error(`core.${name} has no value decoder`);
      }
      return call(ref(decoderName(name)), [["value", value]]);
    }
  }
  throw new Error(`unsupported type in a value decoder: ${kind}`);
}

/** {@link decoderExpression} に型を付けたもの (期待する型の無い位置に置く). 型パーツの読み出しの呼び出しはそのまま */
function typedDecoder(type: Json, value: Json, fresh: () => number): Json {
  return only(type)[0] === "part_reference"
    ? decoderExpression(type, value, fresh)
    : call(ref(TYPED_HELPER), [
        ["T", type],
        ["decoded", decoderExpression(type, value, fresh)],
      ]);
}

/** `core.value-decoded`: `decoded` をそのまま返す ({@link TYPED_HELPER}) */
function typedHelperPart(): SeedPart {
  const typeT = { "#type_parameter": "T" };
  return {
    name: TYPED_HELPER,
    part_type: {
      "#type_function": {
        parameters: [
          { name: "T", type: { "#type_type": null } },
          { name: "decoded", type: optionType(typeT) },
        ],
        return_type: optionType(typeT),
      },
    },
    description: [
      {
        language: "en",
        text: "Return decoded as it is. Gives the type option<T> to #some / #none where no type is expected, such as the target of match (generated by scripts/generate_value_decoders.ts)",
      },
      {
        language: "ja",
        text: "decoded をそのまま返す。match の対象のように期待する型の無い位置の #some / #none に option<T> の型を付ける (scripts/generate_value_decoders.ts が作る)",
      },
    ],
    expression: lambda(
      [
        [0, "T"],
        [1, "decoded"],
      ],
      variable(1),
    ),
  };
}

/** `core.value-to-list`: リストの各要素を `decode` で読む. 読めない要素があれば `none` */
function listHelperPart(): SeedPart {
  const typeT = { "#type_parameter": "T" };
  const listT = { "#type_list": { item_type: typeT } };
  // fn(T$0, items$1, decode$2, index$3, acc$4)
  const item = 5;
  const decoded = 6;
  return {
    name: LIST_HELPER,
    part_type: {
      "#type_function": {
        parameters: [
          { name: "T", type: { "#type_type": null } },
          { name: "items", type: { "#type_list": { item_type: VALUE_TYPE } } },
          {
            name: "decode",
            type: {
              "#type_function": {
                parameters: [{ name: "value", type: VALUE_TYPE }],
                return_type: optionType(typeT),
              },
            },
          },
          { name: "index", type: { "#type_number": null } },
          { name: "acc", type: listT },
        ],
        return_type: optionType(listT),
      },
    },
    description: [
      {
        language: "en",
        text: "Read each item of a list of core.value with decode, appending to acc from index. none if an item cannot be read (generated by scripts/generate_value_decoders.ts)",
      },
      {
        language: "ja",
        text: "core.value のリストの index 番目からの各要素を decode で読んで acc に足す。読めない要素があれば none (scripts/generate_value_decoders.ts が作る)",
      },
    ],
    expression: lambda(
      [
        [0, "T"],
        [1, "items"],
        [2, "decode"],
        [3, "index"],
        [4, "acc"],
      ],
      match(
        call(ref("list-get"), [
          ["list", variable(1)],
          ["index", variable(3)],
        ]),
        [
          [
            { "#variant": { tag: "none", payload: anyPattern } },
            some(variable(4)),
          ],
          [
            bindVariant("some", item, "item"),
            match(call(variable(2), [["value", variable(item)]]), [
              [
                bindVariant("some", decoded, "decoded"),
                call(ref(LIST_HELPER), [
                  ["T", variable(0)],
                  ["items", variable(1)],
                  [
                    "decode",
                    lambda(
                      [[7, "value"]],
                      call(variable(2), [["value", variable(7)]]),
                    ),
                  ],
                  [
                    "index",
                    call(ref("plus"), [
                      ["left", variable(3)],
                      ["right", { "#number": 1 }],
                    ]),
                  ],
                  [
                    "acc",
                    call(ref("list-append"), [
                      ["list", variable(4)],
                      ["item", variable(decoded)],
                    ]),
                  ],
                ]),
              ],
              [anyPattern, none()],
            ]),
          ],
        ],
      ),
    ),
  };
}

/** 型パーツ `core.<typeName>` の値を `core.value` から読むパーツ */
function decoderPart(typeName: string, declaration: Json): SeedPart {
  let next = 1;
  const fresh = () => next++;
  const unionPart =
    only(declaration)[0] === "type_union" ? `core.${typeName}` : undefined;
  return {
    name: decoderName(typeName),
    part_type: {
      "#type_function": {
        parameters: [{ name: "value", type: VALUE_TYPE }],
        return_type: optionType(ref(typeName)),
      },
    },
    description: [
      {
        language: "en",
        text: `Read a value of the evaluator (core.value) as core.${typeName}. none if the shape differs (generated by scripts/generate_value_decoders.ts)`,
      },
      {
        language: "ja",
        text: `評価器の値 (core.value) を core.${typeName} として読む。形が違えば none (scripts/generate_value_decoders.ts が作る)`,
      },
    ],
    expression: lambda(
      [[0, "value"]],
      decoderExpression(
        declaration,
        variable(0),
        fresh,
        unionPart?.slice("core.".length),
      ),
    ),
  };
}

/** `core` の seed に入れる `core.value-to-*` のパーツ */
export function valueDecoderParts(
  core: ReadonlyArray<SeedPart>,
): ReadonlyArray<SeedPart> {
  return [
    typedHelperPart(),
    listHelperPart(),
    ...VALUE_DECODER_TYPES.map((typeName) => {
      const declaration = core.find(
        (seedPart) => seedPart.name === typeName,
      )?.expression;
      if (declaration === undefined) {
        throw new Error(`core.${typeName} is not found`);
      }
      return decoderPart(typeName, declaration);
    }),
  ];
}

/** `core` の seed の `core.value-to-*` を作り直したもの (無ければ末尾に足す) */
export function withValueDecoders(module: SeedModule): SeedModule {
  const generated = valueDecoderParts(module.parts);
  const names = new Set(generated.map((seedPart) => seedPart.name));
  const replaced = module.parts.map(
    (seedPart) => generated.find((g) => g.name === seedPart.name) ?? seedPart,
  );
  const existing = new Set(module.parts.map((seedPart) => seedPart.name));
  return {
    ...module,
    parts: [
      ...replaced,
      ...generated.filter((g) => names.has(g.name) && !existing.has(g.name)),
    ],
  };
}

const CORE_SEED_PATH = "seeds/core.json";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = readFileSync(CORE_SEED_PATH, "utf8");
  const updated = JSON.stringify(
    withValueDecoders(JSON.parse(text) as SeedModule),
    null,
    2,
  );
  if (process.argv.includes("--check")) {
    if (updated !== text) {
      console.error(
        `${CORE_SEED_PATH} の core.value-to-* が古いです. node scripts/generate_value_decoders.ts を実行してください`,
      );
      process.exit(1);
    }
  } else if (updated !== text) {
    writeFileSync(CORE_SEED_PATH, updated);
    console.log(`${CORE_SEED_PATH} の core.value-to-* を書き換えました`);
  }
}
