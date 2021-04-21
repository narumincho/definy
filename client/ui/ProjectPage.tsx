import * as React from "react";
import * as d from "../../data";
import { Editor, Value } from "./Editor";
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
      product={{
        headItem: {
          name: "プロジェクト名",
          value: { canEdit: false, text: project.name },
          iconHash: project.iconHash,
        },
        items: [
          {
            name: "画像",
            value: {
              type: "image",
              value: {
                alternativeText: project.name + "の画像",
                value: project.imageHash,
                canEdit: false,
              },
            },
          },
          {
            name: "作成者",
            value: {
              type: "account",
              value: { accountId: project.createAccountId, canEdit: false },
            },
          },
          {
            name: "作成日時",
            value: {
              type: "time",
              value: { time: project.createTime, canEdit: false },
            },
          },
          {
            name: "プロジェクトID",
            value: {
              type: "text",
              value: { text: props.projectId, canEdit: false },
            },
          },
          {
            name: "型パーツ",
            value: {
              type: "list",
              value: {
                canEdit: true,
                isDirectionColumn: true,
                items:
                  typePartIdListInProject?._ === "Loaded"
                    ? typePartIdListInProject.dataWithTime.data.map(
                        (typePartId): Value => ({
                          type: "typePartId",
                          value: { canEdit: false, typePartId },
                        })
                      )
                    : [],
              },
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
