import { text } from "../server/main.ts";
import { SchemaType, Type } from "../server/schemaType.ts";

/// これは コード生成されたコードにする
/// 直接これを編集しても良いが, 開発モードでブラウザ上でスキーマを編集したときには, 展開された形になる.

/** */
const _typeAccount: Type = {
  id: "7fdffdd73d19422993948fd472e0eefc",
  arguments: [],
};

/**
 * @id
 * ```
 * 7fdffdd73d19422993948fd472e0eefc
 * ```
 */
export type Account = {
  readonly name: string;
};

export const schema: SchemaType<ImplementType> = {
  name: "",
  typeDefinitions: [{
    id: "7fdffdd73d19422993948fd472e0eefc",
    name: "Account",
    attribute: undefined,
    description: "アカウントだよ",
    body: {
      type: "product",
      fields: [{ name: "name", description: "アカウント名", type: text }],
    },
  }],
  functionDefinitions: [
    {
      name: "hello",
      typeParameter: [],
      parameters: [],
      resultType: text,
    },
  ],
  __implementType: {} as ImplementType,
};

export type ImplementType = {
  readonly hello: HelloFunctionType;
};

export type HelloFunctionType = () => Promise<string>;
