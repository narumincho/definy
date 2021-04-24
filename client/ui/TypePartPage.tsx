import * as React from "react";
import * as d from "../../data";
import {
  Value,
  buttonValue,
  listValue,
  productValue,
  projectIdValue,
  sumValue,
  textValue,
  timeValue,
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
    <LoadedTypePartEditor
      accountResource={props.accountResource}
      projectResource={props.projectResource}
      typePartResource={props.typePartResource}
      language={props.language}
      jump={props.onJump}
      typePartId={props.typePartId}
      typePart={typePartResource.dataWithTime.data}
      getTime={typePartResource.dataWithTime.getTime}
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

const LoadedTypePartEditor: React.VFC<
  Pick<
    UseDefinyAppResult,
    | "accountResource"
    | "projectResource"
    | "typePartResource"
    | "language"
    | "jump"
  > & {
    typePartId: d.TypePartId;
    typePart: d.TypePart;
    getTime: d.Time;
  }
> = (props) => {
  const [name, setName] = React.useState<string>(props.typePart.name);
  const [description, setDescription] = React.useState<string>(
    props.typePart.description
  );
  const [attribute, setAttribute] = React.useState<d.Maybe<d.TypeAttribute>>(
    props.typePart.attribute
  );

  return (
    <Editor
      product={{
        headItem: {
          name: props.language === d.Language.Japanese ? "名前" : "name",
          value: {
            canEdit: true,
            text: name,
          },
        },
        items: [
          {
            name:
              props.language === d.Language.Japanese ? "説明" : "description",
            value: textValue({
              canEdit: true,
              text: description,
            }),
          },
          {
            name: props.language === d.Language.Japanese ? "属性" : "attribute",
            value: sumValue({
              valueList:
                props.language === d.Language.Japanese
                  ? ["あり", "なし"]
                  : ["Just", "Nothing"],
              index: attribute._ === "Just" ? 0 : 1,
              value:
                props.typePart.attribute._ === "Just"
                  ? sumValue({
                      valueList:
                        props.language === d.Language.Japanese
                          ? ["boolean として扱う", "undefined として扱う"]
                          : ["AsBoolean", "AsUndefined"],
                      value: undefined,
                      index: 0,
                    })
                  : undefined,
            }),
          },
          {
            name:
              props.language === d.Language.Japanese
                ? "パラメータ"
                : "parameter",
            value: listValue({
              canEdit: true,
              items: props.typePart.typeParameterList.map(
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
                          jump: props.jump,
                          language: props.language,
                        }),
                      },
                    ],
                  })
              ),
            }),
          },
          {
            name: props.language === d.Language.Japanese ? "本体" : "body",
            value: sumValue({
              valueList:
                props.language === d.Language.Japanese
                  ? ["直和", "直積", "カーネル"]
                  : ["Sum", "Product", "Kernel"],
              index: getTypePartBodySumIndex(props.typePart.body),
              value: undefined,
            }),
          },
          {
            name: "保存ボタン",
            value: buttonValue({
              text: "サーバーに保存する",
            }),
          },
          {
            name:
              props.language === d.Language.Japanese
                ? "プロジェクトID"
                : "projectId",
            value: projectIdValue({
              canEdit: false,
              projectId: props.typePart.projectId,
              projectResource: props.projectResource,
              jump: props.jump,
              language: props.language,
            }),
          },
          {
            name:
              props.language === d.Language.Japanese
                ? "型パーツID"
                : "typePartId",
            value: textValue({
              canEdit: false,
              text: props.typePartId,
            }),
          },
          {
            name:
              props.language === d.Language.Japanese ? "取得日時" : "getTime",
            value: timeValue({
              canEdit: false,
              time: props.getTime,
            }),
          },
        ],
      }}
      onRequestDataOperation={(operation) => {
        console.log(operation);
        if (
          operation.tag === "head" &&
          operation.textDataOperation.tag === "edit"
        ) {
          setName(operation.textDataOperation.newValue);
          return;
        }
        if (
          operation.tag === "content" &&
          operation.index === 0 &&
          operation.commonDataOperation.tag === "text" &&
          operation.commonDataOperation.textDataOperation.tag === "edit"
        ) {
          setDescription(
            operation.commonDataOperation.textDataOperation.newValue
          );
          return;
        }
        if (
          operation.tag === "content" &&
          operation.index === 1 &&
          operation.commonDataOperation.tag === "sum" &&
          operation.commonDataOperation.sumDataOperation.tag === "select"
        ) {
          if (operation.commonDataOperation.sumDataOperation.index === 0) {
            setAttribute(d.Maybe.Just(d.TypeAttribute.AsBoolean));
            return;
          }
          if (operation.commonDataOperation.sumDataOperation.index === 1) {
            setAttribute(d.Maybe.Nothing());
          }
        }
      }}
    />
  );
};
