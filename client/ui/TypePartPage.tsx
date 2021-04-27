import * as React from "react";
import * as d from "../../data";
import {
  CommonDataOperation,
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
  const [typeParameterList, setTypeParameterList] = React.useState<
    ReadonlyArray<d.TypeParameter>
  >([]);

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
            value: attributeValue(props.language, attribute),
          },
          {
            name:
              props.language === d.Language.Japanese
                ? "パラメータ"
                : "parameter",
            value: parameterListValue({
              language: props.language,
              jump: props.jump,
              typePartResource: props.typePartResource,
              typeParameterList,
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
        if (operation.tag === "content" && operation.index === 1) {
          attributeOperation(operation.commonDataOperation, setAttribute);
        }
        if (operation.tag === "content" && operation.index === 2) {
          parameterListOperation(
            operation.commonDataOperation,
            typeParameterList,
            setTypeParameterList
          );
        }
      }}
    />
  );
};

const attributeValue = (
  language: d.Language,
  attributeMaybe: d.Maybe<d.TypeAttribute>
): Value => {
  return sumValue({
    valueList:
      language === d.Language.Japanese ? ["あり", "なし"] : ["Just", "Nothing"],
    index: attributeMaybe._ === "Just" ? 0 : 1,
    value:
      attributeMaybe._ === "Just"
        ? sumValue({
            valueList:
              language === d.Language.Japanese
                ? ["boolean として扱う", "undefined として扱う"]
                : ["AsBoolean", "AsUndefined"],
            value: undefined,
            index: attributeMaybe.value === d.TypeAttribute.AsBoolean ? 0 : 1,
          })
        : undefined,
  });
};

const attributeOperation = (
  commonDataOperation: CommonDataOperation,
  setAttribute: (value: React.SetStateAction<d.Maybe<d.TypeAttribute>>) => void
): void => {
  if (commonDataOperation.tag !== "sum") {
    return;
  }
  const sumOp = commonDataOperation.sumDataOperation;
  if (sumOp.tag === "select") {
    if (sumOp.index === 0) {
      setAttribute(d.Maybe.Just(d.TypeAttribute.AsBoolean));
      return;
    }
    if (sumOp.index === 1) {
      setAttribute(d.Maybe.Nothing());
      return;
    }
    return;
  }
  if (
    sumOp.operation.tag !== "sum" ||
    sumOp.operation.sumDataOperation.tag !== "select"
  ) {
    return;
  }
  if (sumOp.operation.sumDataOperation.index === 0) {
    setAttribute(d.Maybe.Just(d.TypeAttribute.AsBoolean));
    return;
  }
  if (sumOp.operation.sumDataOperation.index === 1) {
    setAttribute(d.Maybe.Just(d.TypeAttribute.AsUndefined));
  }
};

const parameterListValue = (
  option: Pick<UseDefinyAppResult, "typePartResource" | "language" | "jump"> & {
    typeParameterList: ReadonlyArray<d.TypeParameter>;
  }
) => {
  return listValue({
    canEdit: true,
    items: option.typeParameterList.map(
      (typeParameter): Value =>
        productValue({
          headItem: {
            name: "name",
            value: { text: typeParameter.name, canEdit: true },
          },
          items: [
            {
              name: "typePartId",
              value: textValue({
                text: typeParameter.typePartId,
                canEdit: false,
              }),
            },
          ],
        })
    ),
  });
};

const parameterListOperation = (
  commonDataOperation: CommonDataOperation,
  typeParameterList: ReadonlyArray<d.TypeParameter>,
  setTypeParameterList: React.Dispatch<
    React.SetStateAction<ReadonlyArray<d.TypeParameter>>
  >
) => {
  if (commonDataOperation.tag !== "list") {
    return;
  }
  const listOp = commonDataOperation.listDataOperation;
  if (listOp.tag === "addLast") {
    setTypeParameterList([
      ...typeParameterList,
      { name: "新たな型パラメータの名前", typePartId: randomTypePartId() },
    ]);
  }
  if (listOp.tag === "delete") {
    setTypeParameterList([
      ...typeParameterList.slice(0, listOp.index - 1),
      ...typeParameterList.slice(listOp.index),
    ]);
  }
};

const randomTypePartId = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((e) => e.toString(16).padStart(2, "0"))
    .join("") as d.TypePartId;
