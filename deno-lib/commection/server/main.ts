import { SchemaType, Type } from "./schemaType.ts";

export const handler = async <ImplementType>(
  request: Request,
  option: {
    schema: SchemaType<ImplementType>;
    implementation: ImplementType;
  },
): Promise<Response> => {
  option.schema.functionDefinitions;
  return new Response("wipppppp");
};

export const handlerSimple = () => {};

// 初回起動時に指定するもの
export const schemaEmpty: SchemaType<never> = {
  name: "",
  typeDefinitions: [],
  functionDefinitions: [],
  __implementType: {} as never,
};

/** 標準の文字列型 */
export const text: Type = {
  id: "0abd4ea5049c4e41986379516e72b1c3",
  arguments: [],
};

/** ファイル配信サーバーで動かせるパラメーター */
export const simpleText: Type = {
  id: "0f0fa0fc5d134c78ac68907c9106f140",
  arguments: [],
};
