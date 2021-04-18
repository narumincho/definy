import * as React from "react";
import * as d from "../../data";
import { Editor } from "./Editor";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";

export type Props = Pick<
  UseDefinyAppResult,
  | "projectResource"
  | "accountResource"
  | "language"
  | "addTypePart"
  | "typePartIdListInProjectResource"
  | "typePartResource"
> & {
  readonly projectId: d.ProjectId;
  readonly onJump: UseDefinyAppResult["jump"];
};

export const ProjectPage: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.projectResource.forciblyRequestToServer(props.projectId);
    props.typePartIdListInProjectResource.forciblyRequestToServer(
      props.projectId
    );
  }, []);

  const projectState = props.projectResource.getFromMemoryCache(
    props.projectId
  );
  const typePartIdListInProject = props.typePartIdListInProjectResource.getFromMemoryCache(
    props.projectId
  );
  if (projectState === undefined) {
    return <div>プロジェクトリクエスト準備前</div>;
  }
  if (projectState._ === "Deleted") {
    return <div>存在しないプロジェクト</div>;
  }
  if (projectState._ === "Unknown") {
    return <div>取得に失敗しました</div>;
  }
  if (projectState._ === "Requesting") {
    return <div>取得中</div>;
  }
  const project = projectState.dataWithTime.data;
  return (
    <Editor
      productType={{
        headItem: {
          name: "プロジェクト名",
          textType: { canEdit: false },
          hasIcon: true,
        },
        items: [
          {
            name: "画像",
            type: { tag: "image", imageType: { canEdit: false } },
          },
          {
            name: "作成者",
            type: { tag: "account", accountType: { canEdit: false } },
          },
          {
            name: "作成日時",
            type: { tag: "time", timeType: { canEdit: false } },
          },
          {
            name: "プロジェクトID",
            type: { tag: "text", textType: { canEdit: false } },
          },
          {
            name: "型パーツ",
            type: {
              tag: "list",
              listType: {
                canEdit: true,
                elementType: {
                  tag: "typePartId",
                  typePartIdType: { canEdit: true },
                },
              },
            },
          },
        ],
      }}
      product={{
        headItem: {
          value: project.name,
          iconHash: project.iconHash,
        },
        items: [
          {
            type: "image",
            value: {
              alternativeText: project.name + "の画像",
              value: project.imageHash,
            },
          },
          {
            type: "account",
            value: { accountId: project.createAccountId },
          },
          {
            type: "time",
            value: project.createTime,
          },
          {
            type: "text",
            value: props.projectId,
          },
          {
            type: "list",
            value: {
              items:
                typePartIdListInProject?._ === "Loaded"
                  ? typePartIdListInProject.dataWithTime.data.map(
                      (typePartId) => ({
                        type: "typePartId",
                        value: typePartId,
                      })
                    )
                  : [],
            },
          },
        ],
      }}
      onJump={props.onJump}
      projectResource={props.projectResource}
      accountResource={props.accountResource}
      typePartResource={props.typePartResource}
      language={props.language}
      onRequestDataOperation={(operation) => {
        if (
          operation.tag === "content" &&
          operation.index === 4 &&
          operation.commonDataOperation.tag === "list"
        ) {
          const listDataOperation =
            operation.commonDataOperation.listDataOperation;
          if (listDataOperation.tag === "addLast") {
            props.addTypePart(props.projectId);
          }
        }
      }}
    />
  );
};
