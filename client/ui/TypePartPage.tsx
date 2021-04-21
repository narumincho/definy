import * as React from "react";
import * as d from "../../data";
import { Editor } from "./Editor";
import { UseDefinyAppResult } from "../hook/useDefinyApp";
import { Value } from "../editor/common";

export type Props = Pick<
  UseDefinyAppResult,
  "accountResource" | "projectResource" | "typePartResource" | "language"
> & {
  typePartId: d.TypePartId;
  onJump: UseDefinyAppResult["jump"];
};

export const TypePartPage: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.typePartResource.forciblyRequestToServer(props.typePartId);
  }, []);

  const typePartResource = props.typePartResource.getFromMemoryCache(
    props.typePartId
  );
  if (typePartResource === undefined) {
    return <div>取得準備中</div>;
  }
  if (typePartResource._ === "Deleted") {
    return (
      <div>
        <div>不明な型パーツ</div>
        <div>型パーツID: {props.typePartId}</div>
      </div>
    );
  }
  if (typePartResource._ === "Unknown") {
    return <div>取得に失敗しました</div>;
  }
  if (typePartResource._ === "Requesting") {
    return <div>取得中</div>;
  }
  return (
    <Editor
      product={{
        headItem: {
          name: "name",
          value: {
            canEdit: true,
            text: typePartResource.dataWithTime.data.name,
          },
        },
        items: [
          {
            name: "description",
            value: {
              type: "text",
              value: {
                text: typePartResource.dataWithTime.data.description,
                canEdit: true,
              },
            },
          },
          {
            name: "attribute",
            value: {
              type: "sum",
              value: {
                valueList: ["Just", "Noting"],
                index:
                  typePartResource.dataWithTime.data.attribute._ === "Just"
                    ? 0
                    : 1,
              },
            },
          },
          {
            name: "parameter",
            value: {
              type: "list",
              value: {
                canEdit: true,
                items: typePartResource.dataWithTime.data.typeParameterList.map(
                  (typeParameter): Value => ({
                    type: "product",
                    value: {
                      headItem: {
                        name: "name",
                        value: { text: typeParameter.name, canEdit: false },
                      },
                      items: [
                        {
                          name: "typePartId",
                          value: {
                            type: "typePartId",
                            value: {
                              typePartId: typeParameter.typePartId,
                              canEdit: true,
                            },
                          },
                        },
                      ],
                    },
                  })
                ),
              },
            },
          },
          {
            name: "body",

            value: {
              type: "sum",
              value: {
                valueList: ["Sum", "Product", "Kernel"],
                index: getTypePartBodySumIndex(
                  typePartResource.dataWithTime.data.body
                ),
              },
            },
          },
          {
            name: "projectId",
            value: {
              type: "project",
              value: {
                canEdit: false,
                projectId: typePartResource.dataWithTime.data.projectId,
              },
            },
          },
        ],
      }}
      accountResource={props.accountResource}
      projectResource={props.projectResource}
      typePartResource={props.typePartResource}
      language={props.language}
      onJump={props.onJump}
      onRequestDataOperation={() => {}}
    />
  );
};

const getTypePartBodySumIndex = (typePartBody: d.TypePartBody): number => {
  if (typePartBody._ === "Sum") {
    return 0;
  }
  if (typePartBody._ === "Product") {
    return 1;
  }
  return 2;
};
