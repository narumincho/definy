import * as React from "react";
import * as d from "../../localData";
import {
  CommonValue,
  buttonValue,
  idValue,
  listValue,
  multiLineTextValue,
  oneLineTextValue,
  productValue,
  projectIdValue,
  sumValue,
  timeValue,
  typeValue,
} from "../editor/common";
import { ListItem, listItem } from "../editor/list";
import { listDeleteAt, listUpdateAt } from "../../common/util";
import { Editor } from "./Editor";
import { SumTagItem } from "../editor/sum";
import { UseDefinyAppResult } from "../hook/useDefinyApp";

export type Props = Pick<
  UseDefinyAppResult,
  | "accountResource"
  | "projectResource"
  | "typePartResource"
  | "language"
  | "typePartIdListInProjectResource"
  | "saveTypePart"
  | "isSavingTypePart"
> & {
  typePartId: d.TypePartId;
  onJump: UseDefinyAppResult["jump"];
};

export const TypePartPage: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.typePartResource.forciblyRequestToServer(props.typePartId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.typePartId]);

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
      saveTypePart={props.saveTypePart}
      isSavingTypePart={props.isSavingTypePart}
      typePartId={props.typePartId}
      typePart={typePartResource.dataWithTime.data}
      getTime={typePartResource.dataWithTime.getTime}
      typePartIdListInProjectResource={props.typePartIdListInProjectResource}
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
    | "typePartIdListInProjectResource"
    | "saveTypePart"
    | "isSavingTypePart"
  > & {
    typePartId: d.TypePartId;
    typePart: d.TypePart;
    getTime: d.Time;
  }
> = (props) => {
  const saveTypePart = props.saveTypePart;
  const [name, setName] = React.useState<string>(props.typePart.name);
  const [description, setDescription] = React.useState<string>(
    props.typePart.description
  );
  const [attribute, setAttribute] = React.useState<d.Maybe<d.TypeAttribute>>(
    props.typePart.attribute
  );
  const [dataTypeParameterList, setDataTypeParameterList] = React.useState<
    ReadonlyArray<d.DataTypeParameter>
  >(props.typePart.dataTypeParameterList);
  const [body, setBody] = React.useState<d.TypePartBody>(props.typePart.body);

  const onClickSaveTypePart = React.useCallback(() => {
    saveTypePart({
      typePartId: props.typePartId,
      name,
      description,
      attribute,
      typeParameterList: dataTypeParameterList,
      body,
    });
  }, [
    attribute,
    body,
    description,
    name,
    props.typePartId,
    saveTypePart,
    dataTypeParameterList,
  ]);

  return (
    <Editor
      product={{
        headItem: {
          name: props.language === d.Language.Japanese ? "名前" : "name",
          value: {
            onChange: setName,
            text: name,
          },
        },
        items: [
          {
            name:
              props.language === d.Language.Japanese ? "説明" : "description",
            value: multiLineTextValue({
              onChange: setDescription,
              text: description,
            }),
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
              typeParameterList: dataTypeParameterList,
              setTypeParameterList: setDataTypeParameterList,
            }),
          },
          {
            name: props.language === d.Language.Japanese ? "本体" : "body",
            value: bodyValue(
              {
                language: props.language,
                typePartResource: props.typePartResource,
                jump: props.jump,
                typePartIdListInProjectResource:
                  props.typePartIdListInProjectResource,
                projectId: props.typePart.projectId,
                scopeTypePartId: props.typePartId,
              },
              body,
              setBody
            ),
          },
          {
            name: props.language === d.Language.Japanese ? "属性" : "attribute",
            value: attributeValue(props.language, attribute, setAttribute),
          },
          {
            name: "保存ボタン",
            value: buttonValue({
              onClick: props.isSavingTypePart ? undefined : onClickSaveTypePart,
              text: props.isSavingTypePart
                ? "サーバーに保存中……"
                : "サーバーに保存する",
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
            value: idValue({
              id: props.typePartId,
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
    />
  );
};

const maybeValue = <T,>(
  language: d.Language,
  valueFunc: (t: T) => CommonValue,
  maybe: d.Maybe<T>,
  onSelectJust: () => void,
  onSelectNothing: () => void
): CommonValue => {
  return sumValue({
    tagList: [
      {
        name: language === d.Language.Japanese ? "あり" : "Just",
        onSelect: onSelectJust,
      },
      {
        name: language === d.Language.Japanese ? "なし" : "Nothing",
        onSelect: onSelectNothing,
      },
    ],
    index: maybe._ === "Just" ? 0 : 1,
    value: maybe._ === "Just" ? valueFunc(maybe.value) : undefined,
  });
};

const attributeValue = (
  language: d.Language,
  attributeMaybe: d.Maybe<d.TypeAttribute>,
  setAttribute: React.Dispatch<React.SetStateAction<d.Maybe<d.TypeAttribute>>>
): CommonValue => {
  return maybeValue(
    language,
    (attribute) =>
      sumValue({
        tagList: [
          {
            name:
              language === d.Language.Japanese
                ? "boolean として扱う"
                : "AsBoolean",
            onSelect: () => {
              setAttribute(d.Maybe.Just(d.TypeAttribute.AsBoolean));
            },
          },
          {
            name:
              language === d.Language.Japanese
                ? "undefined として扱う"
                : "AsUndefined",
            onSelect: () => {
              setAttribute(d.Maybe.Just(d.TypeAttribute.AsUndefined));
            },
          },
          {
            name:
              language === d.Language.Japanese
                ? "number として扱う"
                : "AsNumber",
            onSelect: () => {
              setAttribute(d.Maybe.Just(d.TypeAttribute.AsNumber));
            },
          },
        ],
        value: undefined,
        index: [
          d.TypeAttribute.AsBoolean,
          d.TypeAttribute.AsUndefined,
          d.TypeAttribute.AsNumber,
        ].findIndex((a) => a === attribute),
      }),
    attributeMaybe,
    () => {
      setAttribute(d.Maybe.Just(d.TypeAttribute.AsBoolean));
    },
    () => {
      setAttribute(d.Maybe.Nothing());
    }
  );
};

const parameterListValue = (
  option: Pick<UseDefinyAppResult, "typePartResource" | "language" | "jump"> & {
    typeParameterList: ReadonlyArray<d.DataTypeParameter>;
    setTypeParameterList: React.Dispatch<
      React.SetStateAction<ReadonlyArray<d.DataTypeParameter>>
    >;
  }
): CommonValue => {
  return listValue({
    items: option.typeParameterList.map(
      (typeParameter, index): ListItem =>
        listItem(
          productValue({
            headItem: {
              name: "name",
              value: {
                text: typeParameter.name,
                onChange: (newName) => {
                  option.setTypeParameterList((before) =>
                    listUpdateAt(before, index, (param) => ({
                      name: newName,
                      description: param.description,
                    }))
                  );
                },
              },
            },
            items: [
              {
                name: "description",
                value: oneLineTextValue({
                  text: typeParameter.description,
                  onChange: (newDescription) => {
                    option.setTypeParameterList((before) =>
                      listUpdateAt(before, index, (param) => ({
                        name: param.name,
                        description: newDescription,
                      }))
                    );
                  },
                }),
              },
            ],
          }),
          typeParameter.name
        )
    ),
    addInLast: () => {
      option.setTypeParameterList((before) => [
        ...before,
        {
          name: "新たなデータ型パラメータの名前",
          description: "データ型パラメータの名前",
        },
      ]);
    },
  });
};

const bodyValue = (
  context: Pick<
    UseDefinyAppResult,
    "jump" | "language" | "typePartResource" | "typePartIdListInProjectResource"
  > & { projectId: d.ProjectId; scopeTypePartId: d.TypePartId },
  typePartBody: d.TypePartBody,
  setBody: React.Dispatch<React.SetStateAction<d.TypePartBody>>
): CommonValue => {
  const tagList: ReadonlyArray<SumTagItem> = [
    {
      name: context.language === d.Language.Japanese ? "直和" : "Sum",
      onSelect: () => {
        setBody(
          d.TypePartBody.Sum([
            {
              name: "Pattern",
              description: "",
              parameter: d.Maybe.Nothing(),
            },
          ])
        );
      },
    },
    {
      name: context.language === d.Language.Japanese ? "直積" : "Product",
      onSelect: () => {
        setBody(
          d.TypePartBody.Product([
            {
              name: "member",
              description: "",
              type: {
                input: d.Maybe.Nothing(),
                output: d.DataTypeOrDataTypeParameter.DataType({
                  typePartId: d.Int32.typePartId,
                  arguments: [],
                }),
              },
            },
          ])
        );
      },
    },
    {
      name: context.language === d.Language.Japanese ? "カーネル" : "Kernel",
      onSelect: () => {
        setBody(d.TypePartBody.Kernel(d.TypePartBodyKernel.String));
      },
    },
  ];
  switch (typePartBody._) {
    case "Sum":
      return sumValue({
        tagList,
        index: 0,
        value: patternListValue(
          context,
          typePartBody.patternList,
          (patternListFn) => {
            setBody((prevBody) => {
              if (prevBody._ !== "Sum") {
                return prevBody;
              }
              return d.TypePartBody.Sum(patternListFn(prevBody.patternList));
            });
          }
        ),
      });
    case "Product":
      return sumValue({
        tagList,
        index: 1,
        value: memberListValue(context, typePartBody.memberList, (func) => {
          setBody((prevBody) => {
            if (prevBody._ !== "Product") {
              return prevBody;
            }
            return d.TypePartBody.Product(func(prevBody.memberList));
          });
        }),
      });
    case "Kernel":
      return sumValue({
        tagList,
        index: 2,
        value: kernelValue(typePartBody.typePartBodyKernel, (newKernel) => {
          setBody(d.TypePartBody.Kernel(newKernel));
        }),
      });
  }
};

const patternListValue = (
  context: Pick<
    UseDefinyAppResult,
    "jump" | "language" | "typePartResource" | "typePartIdListInProjectResource"
  > & { projectId: d.ProjectId; scopeTypePartId: d.TypePartId },
  patternList: ReadonlyArray<d.Pattern>,
  setPatternList: (
    func: (prev: ReadonlyArray<d.Pattern>) => ReadonlyArray<d.Pattern>
  ) => void
): CommonValue => {
  return listValue({
    items: patternList.map(
      (pattern, index): ListItem =>
        listItem(
          patternValue(context, pattern, (func) => {
            setPatternList((prev) => listUpdateAt(prev, index, func));
          }),
          pattern.name
        )
    ),
    addInLast: () => {
      setPatternList((prev) => [
        ...prev,
        {
          name: "newPattern",
          description: "",
          parameter: d.Maybe.Nothing(),
        },
      ]);
    },
    deleteAll: () => {
      setPatternList(() => []);
    },
    deleteAt: (index) => {
      setPatternList((prevList) => listDeleteAt(prevList, index));
    },
  });
};

const patternValue = (
  context: Pick<
    UseDefinyAppResult,
    "jump" | "language" | "typePartResource" | "typePartIdListInProjectResource"
  > & { projectId: d.ProjectId; scopeTypePartId: d.TypePartId },
  pattern: d.Pattern,
  setPattern: (func: (prevPattern: d.Pattern) => d.Pattern) => void
): CommonValue =>
  productValue({
    headItem: {
      name: "name",
      value: {
        onChange: (newName) => {
          setPattern((prevPattern) => ({
            name: newName,
            description: prevPattern.description,
            parameter: prevPattern.parameter,
          }));
        },
        text: pattern.name,
      },
    },
    items: [
      {
        name: "description",
        value: oneLineTextValue({
          onChange: (newDescription) => {
            setPattern((prevPattern) => ({
              name: prevPattern.name,
              description: newDescription,
              parameter: prevPattern.parameter,
            }));
          },
          text: pattern.description,
        }),
      },
      {
        name: "parameter",
        value: maybeValue(
          context.language,
          (type) =>
            typeValue({
              type,
              typePartResource: context.typePartResource,
              jump: context.jump,
              language: context.language,
              onChange: (newType) => {
                setPattern((prevPattern) => ({
                  name: prevPattern.name,
                  description: prevPattern.description,
                  parameter: d.Maybe.Just(newType),
                }));
              },
              projectId: context.projectId,
              typePartIdListInProjectResource:
                context.typePartIdListInProjectResource,
              scopeTypePartId: context.scopeTypePartId,
            }),
          pattern.parameter,
          () => {
            setPattern((prevPattern) => ({
              name: prevPattern.name,
              description: prevPattern.description,
              parameter: d.Maybe.Just({
                input: d.Maybe.Nothing(),
                output: d.DataTypeOrDataTypeParameter.DataType({
                  typePartId: d.Int32.typePartId,
                  arguments: [],
                }),
              }),
            }));
          },
          () => {
            setPattern((prevPattern) => ({
              name: prevPattern.name,
              description: prevPattern.description,
              parameter: d.Maybe.Nothing(),
            }));
          }
        ),
      },
    ],
  });

const memberListValue = (
  context: Pick<
    UseDefinyAppResult,
    "typePartResource" | "language" | "jump" | "typePartIdListInProjectResource"
  > & { projectId: d.ProjectId; scopeTypePartId: d.TypePartId },
  memberList: ReadonlyArray<d.Member>,
  setMemberList: (
    func: (prev: ReadonlyArray<d.Member>) => ReadonlyArray<d.Member>
  ) => void
): CommonValue => {
  return listValue({
    items: memberList.map(
      (member, index): ListItem =>
        listItem(
          memberValue(context, member, (func) => {
            setMemberList((prev) => listUpdateAt(prev, index, func));
          }),
          member.name
        )
    ),
    addInLast: () => {
      setMemberList((prev) => [
        ...prev,
        {
          name: "newMember",
          description: "",
          type: {
            input: d.Maybe.Nothing(),
            output: d.DataTypeOrDataTypeParameter.DataType({
              typePartId: d.Int32.typePartId,
              arguments: [],
            }),
          },
        },
      ]);
    },
    deleteAll: () => {
      setMemberList(() => []);
    },
    deleteAt: (index) => {
      setMemberList((prev) => listDeleteAt(prev, index));
    },
  });
};

const memberValue = (
  context: Pick<
    UseDefinyAppResult,
    "typePartResource" | "language" | "jump" | "typePartIdListInProjectResource"
  > & { projectId: d.ProjectId; scopeTypePartId: d.TypePartId },
  member: d.Member,
  setMember: (func: (prev: d.Member) => d.Member) => void
) => {
  return productValue({
    headItem: {
      name: "name",
      value: {
        onChange: (newName) => {
          setMember((prev) => ({
            name: newName,
            description: prev.description,
            type: prev.type,
          }));
        },
        text: member.name,
      },
    },
    items: [
      {
        name: "description",
        value: multiLineTextValue({
          onChange: (newDescription) => {
            setMember((prev) => ({
              name: prev.name,
              description: newDescription,
              type: prev.type,
            }));
          },
          text: member.description,
        }),
      },
      {
        name: "type",
        value: typeValue({
          type: member.type,
          typePartResource: context.typePartResource,
          jump: context.jump,
          language: context.language,
          onChange: (newType) => {
            setMember((prev) => ({
              name: prev.name,
              description: prev.description,
              type: newType,
            }));
          },
          projectId: context.projectId,
          typePartIdListInProjectResource:
            context.typePartIdListInProjectResource,
          scopeTypePartId: context.scopeTypePartId,
        }),
      },
    ],
  });
};

const typePartBodyKernelValueList: ReadonlyArray<d.TypePartBodyKernel> = [
  "Int32",
  "String",
  "Binary",
  "Id",
  "Token",
  "List",
  "Dict",
];

const kernelValue = (
  typePartBodyKernel: d.TypePartBodyKernel,
  setTypePartBodyKernel: (typePartBody: d.TypePartBodyKernel) => void
) => {
  return sumValue({
    tagList: [
      {
        name: "Int32",
        onSelect: () => {
          setTypePartBodyKernel(d.TypePartBodyKernel.Int32);
        },
      },
      {
        name: "String",
        onSelect: () => {
          setTypePartBodyKernel(d.TypePartBodyKernel.String);
        },
      },
      {
        name: "Binary",
        onSelect: () => {
          setTypePartBodyKernel(d.TypePartBodyKernel.Binary);
        },
      },
      {
        name: "Id",
        onSelect: () => {
          setTypePartBodyKernel(d.TypePartBodyKernel.Id);
        },
      },
      {
        name: "Token",
        onSelect: () => {
          setTypePartBodyKernel(d.TypePartBodyKernel.Token);
        },
      },
      {
        name: "List",
        onSelect: () => {
          setTypePartBodyKernel(d.TypePartBodyKernel.List);
        },
      },
      {
        name: "Dict",
        onSelect: () => {
          setTypePartBodyKernel(d.TypePartBodyKernel.Dict);
        },
      },
    ],
    index: typePartBodyKernelValueList.indexOf(typePartBodyKernel),
    value: undefined,
  });
};
