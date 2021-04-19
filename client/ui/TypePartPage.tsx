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
      productType={{
        headItem: {
          name: "name",
          hasIcon: false,
          textType: { canEdit: true },
        },
        items: [
          {
            name: "description",
            type: { tag: "text", textType: { canEdit: true } },
          },
          {
            name: "attribute",
            type: { tag: "sum", sumType: { valueList: ["Just", "Noting"] } },
          },
          {
            name: "parameter",
            type: {
              tag: "list",
              listType: {
                canEdit: true,
                elementType: {
                  tag: "product",
                  productType: {
                    headItem: {
                      name: "name",
                      textType: { canEdit: true },
                      hasIcon: false,
                    },
                    items: [
                      {
                        name: "typePartId",
                        type: {
                          tag: "typePartId",
                          typePartIdType: { canEdit: true },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            name: "body",
            type: {
              tag: "sum",
              sumType: {
                valueList: ["Sum", "Product", "Kernel"],
              },
            },
          },
          {
            name: "projectId",
            type: {
              tag: "project",
              projectType: { canEdit: false },
            },
          },
        ],
      }}
      product={{
        headItem: {
          value: typePartResource.dataWithTime.data.name,
        },
        items: [
          {
            type: "text",
            value: typePartResource.dataWithTime.data.description,
          },
          {
            type: "sum",
            value: {
              index:
                typePartResource.dataWithTime.data.attribute._ === "Just"
                  ? 0
                  : 1,
            },
          },
          {
            type: "list",
            value: {
              items: typePartResource.dataWithTime.data.typeParameterList.map(
                (typeParameter): Value => ({
                  type: "product",
                  value: {
                    headItem: { value: typeParameter.name },
                    items: [
                      {
                        type: "typePartId",
                        value: typeParameter.typePartId,
                      },
                    ],
                  },
                })
              ),
            },
          },
          {
            type: "sum",
            value: {
              index: getTypePartBodySumIndex(
                typePartResource.dataWithTime.data.body
              ),
            },
          },
          {
            type: "project",
            value: typePartResource.dataWithTime.data.projectId,
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
