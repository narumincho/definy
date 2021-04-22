import * as React from "react";
import * as d from "../../data";
import { Editor, Value } from "./Editor";
import {
  accountIdValue,
  imageValue,
  listValue,
  textValue,
  timeValue,
  typePartIdValue,
} from "../editor/common";
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
            value: imageValue({
              alternativeText: project.name + "の画像",
              value: project.imageHash,
              canEdit: false,
            }),
          },
          {
            name: "作成者",
            value: accountIdValue({
              accountId: project.createAccountId,
              canEdit: false,
              accountResource: props.accountResource,
              jump: props.onJump,
              language: props.language,
            }),
          },
          {
            name: "作成日時",
            value: timeValue({
              time: project.createTime,
              canEdit: false,
            }),
          },
          {
            name: "プロジェクトID",
            value: textValue({
              text: props.projectId,
              canEdit: false,
            }),
          },
          {
            name: "型パーツ",
            value: listValue({
              canEdit: true,
              isDirectionColumn: true,
              items:
                typePartIdListInProject?._ === "Loaded"
                  ? typePartIdListInProject.dataWithTime.data.map(
                      (typePartId): Value =>
                        typePartIdValue({
                          canEdit: false,
                          typePartId,
                          typePartResource: props.typePartResource,
                          jump: props.onJump,
                          language: props.language,
                        })
                    )
                  : [],
            }),
          },
        ],
      }}
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
