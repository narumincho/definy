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
import type { ProductDataOperation } from "../editor/product";
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
  >(props.typePart.typeParameterList);
  const [body, setBody] = React.useState<d.TypePartBody>(props.typePart.body);

  const onRequestDataOperation = (operation: ProductDataOperation): void => {
    console.log(operation);
    if (operation.tag === "head") {
      if (operation.textDataOperation.tag === "edit") {
        setName(operation.textDataOperation.newValue);
      }
      return;
    }
    if (
      operation.index === 0 &&
      operation.commonDataOperation.tag === "text" &&
      operation.commonDataOperation.textDataOperation.tag === "edit"
    ) {
      setDescription(operation.commonDataOperation.textDataOperation.newValue);
      return;
    }
    if (operation.index === 1) {
      attributeOperation(operation.commonDataOperation, setAttribute);
      return;
    }
    if (operation.index === 2) {
      parameterListOperation(
        operation.commonDataOperation,
        typeParameterList,
        setTypeParameterList
      );
      return;
    }
    if (operation.index === 3) {
      bodyOperation(operation.commonDataOperation, setBody);
    }
  };

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
            value: bodyValue(
              {
                language: props.language,
                typePartResource: props.typePartResource,
                jump: props.jump,
              },
              body
            ),
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
      onRequestDataOperation={onRequestDataOperation}
    />
  );
};

const maybeValue = <T extends unknown, Context extends unknown>(
  language: d.Language,
  context: Context,
  valueFunc: (c: Context, t: T) => Value,
  maybe: d.Maybe<T>
): Value => {
  return sumValue({
    valueList:
      language === d.Language.Japanese ? ["あり", "なし"] : ["Just", "Nothing"],
    index: maybe._ === "Just" ? 0 : 1,
    value: maybe._ === "Just" ? valueFunc(context, maybe.value) : undefined,
  });
};

const attributeValue = (
  language: d.Language,
  attributeMaybe: d.Maybe<d.TypeAttribute>
): Value => {
  return maybeValue(
    language,
    undefined,
    (_, attribute) =>
      sumValue({
        valueList:
          language === d.Language.Japanese
            ? ["boolean として扱う", "undefined として扱う"]
            : ["AsBoolean", "AsUndefined"],
        value: undefined,
        index: attribute === d.TypeAttribute.AsBoolean ? 0 : 1,
      }),
    attributeMaybe
  );
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
): Value => {
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
): void => {
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

const bodyValue = (
  context: Pick<UseDefinyAppResult, "jump" | "language" | "typePartResource">,
  typePartBody: d.TypePartBody
): Value => {
  const valueList =
    context.language === d.Language.Japanese
      ? (["直和", "直積", "カーネル"] as const)
      : (["Sum", "Product", "Kernel"] as const);
  switch (typePartBody._) {
    case "Sum":
      return sumValue({
        valueList,
        index: 0,
        value: patternListValue(context, typePartBody.patternList),
      });
    case "Product":
      return sumValue({
        valueList,
        index: 1,
        value: undefined,
      });
    case "Kernel":
      return sumValue({
        valueList,
        index: 2,
        value: undefined,
      });
  }
};

const patternListValue = (
  context: Pick<UseDefinyAppResult, "jump" | "language" | "typePartResource">,
  patternList: ReadonlyArray<d.Pattern>
): Value => {
  return listValue({
    canEdit: true,
    items: patternList.map((pattern) => patternValue(context, pattern)),
  });
};

const patternValue = (
  context: Pick<UseDefinyAppResult, "jump" | "language" | "typePartResource">,
  pattern: d.Pattern
): Value =>
  productValue({
    headItem: {
      name: "name",
      value: { canEdit: true, text: pattern.name },
    },
    items: [
      {
        name: "description",
        value: textValue({ canEdit: true, text: pattern.description }),
      },
      {
        name: "parameter",
        value: maybeValue(
          context.language,
          context,
          typeValue,
          pattern.parameter
        ),
      },
    ],
  });

const typeValue = (
  context: Pick<UseDefinyAppResult, "jump" | "language" | "typePartResource">,
  type: d.Type
): Value => {
  return productValue({
    items: [
      {
        name: "typePartId",
        value: typePartIdValue({
          canEdit: true,
          typePartId: type.typePartId,
          jump: context.jump,
          language: context.language,
          typePartResource: context.typePartResource,
        }),
      },
      {
        name: "parameter",
        value: listValue({
          canEdit: true,
          items: type.parameter.map((p) => typeValue(context, p)),
        }),
      },
    ],
  });
};

const bodyOperation = (
  commonDataOperation: CommonDataOperation,
  setBody: React.Dispatch<React.SetStateAction<d.TypePartBody>>
) => {
  if (commonDataOperation.tag !== "sum") {
    return;
  }
  const sumOp = commonDataOperation.sumDataOperation;
  if (sumOp.tag === "select") {
    if (sumOp.index === 0) {
      setBody(
        d.TypePartBody.Sum([
          { name: "Pattern", description: "", parameter: d.Maybe.Nothing() },
        ])
      );
    }
    if (sumOp.index === 1) {
      setBody(
        d.TypePartBody.Product([
          {
            name: "member",
            description: "",
            type: { typePartId: d.Int32.typePartId, parameter: [] },
          },
        ])
      );
    }
    if (sumOp.index === 2) {
      setBody(d.TypePartBody.Kernel(d.TypePartBodyKernel.String));
    }
  }
};
