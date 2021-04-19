import * as d from "../data";
import type { UseDefinyAppResult } from "../client/hook/useDefinyApp";
import { action } from "@storybook/addon-actions";

export const account1Id = "afcc321463d3b693de0e8cd70af65eba" as d.AccountId;

export const project1Id = "0fccb11463d3b69dde018cd70af65eba" as d.ProjectId;

export const project1: d.Project = {
  name: "プロジェクト名",
  createAccountId: account1Id,
  createTime: { day: 0, millisecond: 0 },
  iconHash: "4fd10948344af0b16748efef0f2015700c87554be13036e13b99a56fc422ed02" as d.ImageHash,
  imageHash: "3a08c6750c510132e89a7c16f31aabfc6370d443cdc9ed05ab3346dbf5456bdb" as d.ImageHash,
  updateTime: { day: 0, millisecond: 0 },
};

export const project2Id = "8ef7cce240fba7eae799f309caffa187" as d.ProjectId;

export const project2: d.Project = {
  name: "プロジェクト2",
  createAccountId: account1Id,
  createTime: { day: 0, millisecond: 0 },
  iconHash: "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73" as d.ImageHash,
  imageHash: "3204f96f9e58c0d720c39599747e7568872a396b3442e1cfe7607d041901277c" as d.ImageHash,
  updateTime: { day: 0, millisecond: 0 },
};

export const typePart1Id = "500d9bc147fe8c1efaa5fb6c8222ce2e" as d.TypePartId;

export const projectResource: UseDefinyAppResult["projectResource"] = {
  forciblyRequestToServer: action(
    "強制的にプロジェクトをサーバーから取得しようとした"
  ),
  requestToServerIfEmpty: action(
    "キャッシュになければ, プロジェクトをサーバーにリクエストしようとした"
  ),
  getFromMemoryCache: () => {
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
        name: "サンプルアカウント",
        createTime: { day: 0, millisecond: 0 },
        imageHash: "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73" as d.ImageHash,
        introduction: "対戦よろしくおねがいします",
      },
      getTime: { day: 0, millisecond: 0 },
    });
  },
};

export const typePartIdListInProjectResource: UseDefinyAppResult["typePartIdListInProjectResource"] = {
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
      data: [typePart1Id],
      getTime: { day: 0, millisecond: 0 },
    });
  },
};
export const typePartResource: UseDefinyAppResult["typePartResource"] = {
  forciblyRequestToServer: action("強制的に 型パーツを取得しようとした"),
  requestToServerIfEmpty: action(
    "キャッシュになければ, 型パーツを取得しようとした"
  ),
  getFromMemoryCache: () => {
    return d.ResourceState.Loaded({
      data: {
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
        typeParameterList: [],
      },
      getTime: { day: 0, millisecond: 0 },
    });
  },
};
