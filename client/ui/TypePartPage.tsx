import * as React from "react";
import * as d from "../../data";
import {
  Value,
  listValue,
  productValue,
  projectIdValue,
  sumValue,
  textValue,
  typePartIdValue,
} from "../editor/common";
import { Editor } from "./Editor";
import { UseDefinyAppResult } from "../hook/useDefinyApp";

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
            value: textValue({
              text: typePartResource.dataWithTime.data.description,
              canEdit: true,
            }),
          },
          {
            name: "attribute",
            value: sumValue({
              valueList: ["Just", "Noting"],
              index:
                typePartResource.dataWithTime.data.attribute._ === "Just"
                  ? 0
                  : 1,
            }),
          },
          {
            name: "parameter",
            value: listValue({
              canEdit: true,
              items: typePartResource.dataWithTime.data.typeParameterList.map(
                (typeParameter): Value =>
                  productValue({
                    headItem: {
                      name: "name",
                      value: { text: typeParameter.name, canEdit: false },
                    },
                    items: [
                      {
                        name: "typePartId",
                        value: typePartIdValue({
                          typePartId: typeParameter.typePartId,
                          canEdit: true,
                          typePartResource: props.typePartResource,
                          jump: props.onJump,
                          language: props.language,
                        }),
                      },
                    ],
                  })
              ),
            }),
          },
          {
            name: "body",
            value: sumValue({
              valueList: ["Sum", "Product", "Kernel"],
              index: getTypePartBodySumIndex(
                typePartResource.dataWithTime.data.body
              ),
            }),
          },
          {
            name: "projectId",
            value: projectIdValue({
              canEdit: false,
              projectId: typePartResource.dataWithTime.data.projectId,
              projectResource: props.projectResource,
              jump: props.onJump,
              language: props.language,
            }),
          },
        ],
      }}
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
