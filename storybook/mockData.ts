import * as d from "../localData";
import type { UseDefinyAppResult } from "../client/hook/useDefinyApp";
import { action } from "@storybook/addon-actions";

export const account1Id = d.AccountId.fromString(
  "afcc321463d3b693de0e8cd70af65eba"
);

export const project1Id = d.ProjectId.fromString(
  "0fccb11463d3b69dde018cd70af65eba"
);

export const project1: d.Project = {
  id: project1Id,
  name: "プロジェクト名",
  createAccountId: account1Id,
  createTime: { day: 0, millisecond: 0 },
  iconHash: d.ImageHash.fromString(
    "4fd10948344af0b16748efef0f2015700c87554be13036e13b99a56fc422ed02"
  ),
  imageHash: d.ImageHash.fromString(
    "3a08c6750c510132e89a7c16f31aabfc6370d443cdc9ed05ab3346dbf5456bdb"
  ),
  updateTime: { day: 0, millisecond: 0 },
};

export const project2Id = d.ProjectId.fromString(
  "8ef7cce240fba7eae799f309caffa187"
);

export const project2: d.Project = {
  id: project2Id,
  name: "プロジェクト2",
  createAccountId: account1Id,
  createTime: { day: 0, millisecond: 0 },
  iconHash: d.ImageHash.fromString(
    "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73"
  ),
  imageHash: d.ImageHash.fromString(
    "3204f96f9e58c0d720c39599747e7568872a396b3442e1cfe7607d041901277c"
  ),
  updateTime: { day: 0, millisecond: 0 },
};

export const projectResource: UseDefinyAppResult["projectResource"] = {
  forciblyRequestToServer: action(
    "強制的にプロジェクトをサーバーから取得しようとした"
  ),
  requestToServerIfEmpty: action(
    "キャッシュになければ, プロジェクトをサーバーにリクエストしようとした"
  ),
  getFromMemoryCache: (projectId) => {
    if (projectId === project2Id) {
      return d.ResourceState.Loaded({
        data: project2,
        getTime: { day: 0, millisecond: 0 },
      });
    }
    return d.ResourceState.Loaded({
      data: project1,
      getTime: { day: 0, millisecond: 0 },
    });
  },
};

export const accountResource: UseDefinyAppResult["accountResource"] = {
  forciblyRequestToServer: action(
    "強制的にアカウントをサーバーから取得しようとした"
  ),
  requestToServerIfEmpty: action(
    "キャッシュになければ, アカウントをサーバーにリクエストしようとした"
  ),
  getFromMemoryCache: () => {
    return d.ResourceState.Loaded({
      data: {
        id: account1Id,
        name: "サンプルアカウント",
        createTime: { day: 0, millisecond: 0 },
        imageHash: d.ImageHash.fromString(
          "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73"
        ),
        introduction: "対戦よろしくおねがいします",
      },
      getTime: { day: 0, millisecond: 0 },
    });
  },
};

export const typePartIdListInProjectResource: UseDefinyAppResult["typePartIdListInProjectResource"] =
  {
    forciblyRequestToServer: action(
      "強制的にプロジェクトに属する型パーツ一覧を取得しようとした"
    ),
    requestToServerIfEmpty: action(
      "キャッシュになければ, プロジェクトに属する質問を取得しようとした"
    ),
    getFromMemoryCache: ():
      | d.ResourceState<ReadonlyArray<d.TypePartId>>
      | undefined => {
      return d.ResourceState.Loaded({
        data: [typePart1Id, listTypePartId, resultTypePartId],
        getTime: { day: 0, millisecond: 0 },
      });
    },
  };

export const typePart1Id = d.TypePartId.fromString(
  "860f022381516f6eae126338851d9a37"
);
export const listTypePartId = d.TypePartId.fromString(
  "97c3b7967f35d2dcf34332fe769bc773"
);
export const resultTypePartId = d.TypePartId.fromString(
  "38fd51297bf15fd87254974ebc36d43f"
);

export const typePart: d.TypePart = {
  id: resultTypePartId,
  name: "サンプル型パーツ",
  attribute: d.Maybe.Nothing(),
  description: "サンプルの型パーツの説明文",
  projectId: project1Id,
  body: d.TypePartBody.Sum([
    {
      name: "Pattern1",
      description: "パターン1",
      parameter: d.Maybe.Nothing(),
    },
  ]),
  dataTypeParameterList: [],
};

export const listTypePart: d.TypePart = {
  id: listTypePartId,
  name: "List",
  attribute: d.Maybe.Nothing(),
  description: "リスト. JavaScriptのArrayで扱う",
  projectId: project1Id,
  body: d.TypePartBody.Kernel(d.TypePartBodyKernel.List),
  dataTypeParameterList: [
    {
      name: "element",
      typePartId: d.TypePartId.fromString("7df9be49c3f18512abd87184776f3262"),
    },
  ],
};

export const resultTypePart: d.TypePart = {
  id: resultTypePartId,
  name: "Result",
  attribute: d.Maybe.Nothing(),
  description:
    "成功と失敗を表す型. 今後はRustのstd::Resultに出力するために属性をつける?",
  projectId: project1Id,
  body: d.TypePartBody.Kernel(d.TypePartBodyKernel.List),
  dataTypeParameterList: [
    {
      name: "ok",
      typePartId: d.TypePartId.fromString("82c7167c9d832e8383b161e4c0652b4a"),
    },
    {
      name: "error",
      typePartId: d.TypePartId.fromString("bd8be8409130f30f15c5c86c01de6dc5"),
    },
  ],
};

export const typePartResource: UseDefinyAppResult["typePartResource"] = {
  forciblyRequestToServer: action("強制的に 型パーツを取得しようとした"),
  requestToServerIfEmpty: action(
    "キャッシュになければ, 型パーツを取得しようとした"
  ),
  getFromMemoryCache: (typePartId) => {
    if (typePartId === listTypePartId) {
      return d.ResourceState.Loaded({
        data: listTypePart,
        getTime: { day: 0, millisecond: 0 },
      });
    }
    if (typePartId === resultTypePartId) {
      return d.ResourceState.Loaded({
        data: resultTypePart,
        getTime: { day: 0, millisecond: 0 },
      });
    }
    return d.ResourceState.Loaded({
      data: typePart,
      getTime: { day: 0, millisecond: 0 },
    });
  },
};
