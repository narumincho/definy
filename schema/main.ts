import * as codeGen from "js-ts-code-generator";
import * as commonSchemaDefinition from "definy-common/schema/definition";
import * as nType from "@narumincho/type";
import * as prettier from "prettier";
import {
  CustomTypeDefinition,
  CustomTypeDefinitionBody,
  Maybe,
  Type,
} from "@narumincho/type/distribution/data";
import { promises as fileSystem } from "fs";

const responseDataName = "ResponseData";

export const customTypeList: ReadonlyArray<CustomTypeDefinition> = [
  ...commonSchemaDefinition.customTypeList,
  {
    name: "RequestState",
    description: "リクエストの状態",
    typeParameterList: [],
    body: CustomTypeDefinitionBody.Sum([
      {
        name: "NotRequest",
        description: "まだ,リクエストしていない",
        parameter: Maybe.Nothing(),
      },
      {
        name: "WaitRequest",
        description: "リクエストをする (まだしていない)",
        parameter: Maybe.Nothing(),
      },
      {
        name: "Requesting",
        description: "リクエストをしている途中",
        parameter: Maybe.Nothing(),
      },
      {
        name: "Respond",
        description: "リクエストをすでにした",
        parameter: Maybe.Nothing(),
      },
    ]),
  },
  {
    name: "Response",
    description: "データのレスポンス",
    typeParameterList: ["id", "data"],
    body: CustomTypeDefinitionBody.Product([
      {
        name: "id",
        description: "ID",
        type: Type.Parameter("id"),
      },
      {
        name: "data",
        description: "データ",
        type: Type.Custom({
          name: responseDataName,
          parameterList: [Type.Parameter("data")],
        }),
      },
    ]),
  },
  {
    name: responseDataName,
    description: "レスポンスのデータ",
    typeParameterList: ["data"],
    body: CustomTypeDefinitionBody.Sum([
      {
        name: "Found",
        description: "見つかった",
        parameter: Maybe.Just(Type.Parameter("data")),
      },
      {
        name: "NotFound",
        description: "見つからなかった",
        parameter: Maybe.Nothing(),
      },
      {
        name: "Error",
        description: "取得に失敗した",
        parameter: Maybe.Nothing(),
      },
    ]),
  },
  {
    name: "Resource",
    description: "ProjectやUserなどのリソースの保存状態を表す",
    typeParameterList: ["data"],
    body: CustomTypeDefinitionBody.Sum([
      {
        name: "Loading",
        description:
          "サーバーにリクエストしている最中や, indexedDBから読み込んでいるとき",
        parameter: Maybe.Nothing(),
      },
      {
        name: "Loaded",
        description: "データを取得済み",
        parameter: Maybe.Just(Type.Parameter("data")),
      },
      {
        name: "NotFound",
        description: "データが見つからなかった",
        parameter: Maybe.Nothing(),
      },
      {
        name: "Error",
        description: "取得に失敗した.",
        parameter: Maybe.Nothing(),
      },
    ]),
  },
];

const code = prettier.format(
  codeGen.generateCodeAsString(
    nType.generateTypeScriptCode(customTypeList),
    "TypeScript"
  ),
  { parser: "typescript" }
);

const outFilePath = "./source/data.ts";

fileSystem.writeFile(outFilePath, code).then(() => {
  console.log(`output complete. ${outFilePath}`);
});
