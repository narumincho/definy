import * as a from "https://raw.githubusercontent.com/narumincho/definy/4983eef4d98387d8843f4085f799ad22aee5993c/deno-lib/typedJson.ts";

/**
 * functionByNameの結果
 */
export type FunctionDetail = {
  /**
   * 名前空間付き, 関数名
   */
  readonly name: globalThis.ReadonlyArray<string>;
  /**
   * 関数の説明文
   */
  readonly description: string;

  readonly __functionDetailBrand: never;
};

const functionDetailProto = {
  [Symbol.toStringTag]: "definyRpc.FunctionDetail",
  toString: function (this: FunctionDetail) {
    return "definyRpc.FunctionDetail({ name: [" +
      this.name.map((e) => JSON.stringify(e)).join(",") +
      "]})";
  },
};

/**
 * functionByNameの結果
 */
export const FunctionDetail: {
  /**
   * FunctionDetail の説明文
   */
  readonly description: string;
  /**
   * JsonからFunctionDetailに変換する. 失敗した場合はエラー
   */
  readonly fromJson: (a: a.StructuredJsonValue) => FunctionDetail;
} = {
  description: "functionByNameの結果",
  fromJson: (jsonValue: a.StructuredJsonValue): FunctionDetail => {
    if (jsonValue.type !== "object") {
      throw new Error("expected object in FunctionDetail.fromJson");
    }
    const name: a.StructuredJsonValue | undefined = jsonValue.value.get("name");
    if (name === undefined) {
      throw new Error("expected name field. in FunctionDetail.fromJson");
    }
    const description: a.StructuredJsonValue | undefined = jsonValue.value.get(
      "description",
    );
    if (description === undefined) {
      throw new Error("expected description field. in FunctionDetail.fromJson");
    }
    const input: a.StructuredJsonValue | undefined = jsonValue.value.get(
      "input",
    );
    if (input === undefined) {
      throw new Error("expected input field. in FunctionDetail.fromJson");
    }
    const output: a.StructuredJsonValue | undefined = jsonValue.value.get(
      "output",
    );
    if (output === undefined) {
      throw new Error("expected output field. in FunctionDetail.fromJson");
    }

    const k = Object.freeze(Object.defineProperties({}, {
      name: { value: "sample", enumerable: true },
      [Symbol.toStringTag]: {
        value: "TypeName",
        enumerable: false,
      },
    }));

    return Object.freeze(Object.defineProperties<FunctionDetail>(
      Object.create(functionDetailProto),
      { name: { value: "sample", enumerable: true } },
    ));
  },
};
