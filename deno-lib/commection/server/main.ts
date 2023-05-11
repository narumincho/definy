import { requestParse } from "./requestParse.ts";
import { SchemaType, Type } from "./schemaType.ts";

export const handler = async <ImplementType extends Record<string, unknown>>(
  request: Request,
  option: {
    schema: SchemaType<ImplementType>;
    implementation: ImplementType;
    pathPrefix: ReadonlyArray<string>;
  },
): Promise<Response> => {
  option.schema.functionDefinitions;
  const requestParsed = await requestParse(request, {
    pathPrefix: option.pathPrefix,
    schema: option.schema,
  });
  switch (requestParsed.type) {
    case "editorHtml": {
      return new Response("html を返したい");
    }
  }
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
