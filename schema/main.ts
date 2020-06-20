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
    name: "Resource",
    description: "ProjectやUserなどのリソースの保存状態を表す",
    typeParameterList: ["data"],
    body: CustomTypeDefinitionBody.Sum([
      {
        name: "Loaded",
        description: "データを取得済み",
        parameter: Maybe.Just(Type.Parameter("data")),
      },
      {
        name: "Unknown",
        description: "データを取得できなかった (サーバーの障害, オフライン)",
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
  {
    name: "TokenResource",
    description:
      "キーであるTokenによってデータが必ず1つに決まるもの. 絶対に更新されない",
    typeParameterList: ["data"],
    body: CustomTypeDefinitionBody.Sum([
      {
        name: "Loaded",
        description: "取得済み",
        parameter: Maybe.Just(Type.Parameter("data")),
      },
      {
        name: "Unknown",
        description: "データを取得できなかった (サーバーの障害, オフライン)",
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
