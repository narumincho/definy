import * as codeGen from "js-ts-code-generator";
import * as commonSchemaDefinition from "definy-common/schema/definition";
import * as commonType from "definy-common/schema/customType";
import * as nType from "@narumincho/type";
import * as prettier from "prettier";
import {
  CustomTypeDefinition,
  CustomTypeDefinitionBody,
  Maybe,
  Type,
} from "@narumincho/type/distribution/data";
import { promises as fileSystem } from "fs";

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
    name: "Resource",
    description: "ProjectやUserなどのリソースの保存状態を表す",
    typeParameterList: ["data"],
    body: CustomTypeDefinitionBody.Sum([
      {
        name: "Found",
        description: "データがある",
        parameter: Maybe.Just(Type.Parameter("data")),
      },
      {
        name: "NotFound",
        description: "データが存在しない",
        parameter: Maybe.Nothing(),
      },
      {
        name: "Unknown",
        description: "データが存在しているか確認できない",
        parameter: Maybe.Nothing(),
      },
      {
        name: "WaitLoading",
        description: "indexedDBにアクセス待ち",
        parameter: Maybe.Nothing(),
      },
      {
        name: "Loading",
        description: "indexedDBにアクセス中",
        parameter: Maybe.Nothing(),
      },
      {
        name: "WaitRequesting",
        description: "サーバに問い合わせ待ち",
        parameter: Maybe.Nothing(),
      },
      {
        name: "Requesting",
        description: "サーバに問い合わせ中",
        parameter: Maybe.Nothing(),
      },
      {
        name: "WaitUpdating",
        description: "更新待ち",
        parameter: Maybe.Just(Type.Parameter("data")),
      },
      {
        name: "Updating",
        description: "サーバーに問い合わせてリソースを更新中",
        parameter: Maybe.Just(Type.Parameter("data")),
      },
      {
        name: "WaitRetrying",
        description: "Unknownだったリソースをサーバーに問い合わせ待ち",
        parameter: Maybe.Nothing(),
      },
      {
        name: "Retrying",
        description: "Unknownだったリソースをサーバーに問い合わせ中",
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
