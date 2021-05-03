import * as React from "react";
import * as d from "../../data";
import {
  CommonValue,
  buttonValue,
  listValue,
  productValue,
  projectIdValue,
  sumValue,
  textValue,
  timeValue,
  typeValue,
} from "../editor/common";
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
  const [typeParameterList, setTypeParameterList] = React.useState<
    ReadonlyArray<d.TypeParameter>
  >(props.typePart.typeParameterList);
  const [body, setBody] = React.useState<d.TypePartBody>(props.typePart.body);

  const onClickSaveTypePart = React.useCallback(() => {
    saveTypePart(props.typePartId, {
      name,
      description,
      attribute,
      typeParameterList,
      body,
      projectId: props.typePart.projectId,
    });
  }, [
    attribute,
    body,
    description,
    name,
    props.typePart.projectId,
    props.typePartId,
    saveTypePart,
    typeParameterList,
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
            value: textValue({
              onChange: setDescription,
              text: description,
            }),
          },
          {
            name: props.language === d.Language.Japanese ? "属性" : "attribute",
            value: attributeValue(props.language, attribute, setAttribute),
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
              setTypeParameterList,
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
              },
              body,
              setBody
            ),
          },
          {
            name: "保存ボタン",
            value: buttonValue({
              onClick: onClickSaveTypePart,
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
              onChange: undefined,
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
    />
  );
};

const maybeValue = <T extends unknown>(
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
        ],
        value: undefined,
        index: attribute === d.TypeAttribute.AsBoolean ? 0 : 1,
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
    typeParameterList: ReadonlyArray<d.TypeParameter>;
    setTypeParameterList: React.Dispatch<
      React.SetStateAction<ReadonlyArray<d.TypeParameter>>
    >;
  }
): CommonValue => {
  return listValue({
    items: option.typeParameterList.map(
      (typeParameter, index): CommonValue =>
        productValue({
          headItem: {
            name: "name",
            value: {
              text: typeParameter.name,
              onChange: (newName) => {
                option.setTypeParameterList((before) =>
                  listUpdateAt(before, index, (param) => ({
                    name: newName,
                    typePartId: param.typePartId,
                  }))
                );
              },
            },
          },
          items: [
            {
              name: "typePartId",
              value: textValue({
                text: typeParameter.typePartId,
                onChange: undefined,
              }),
            },
          ],
        })
    ),
    addInLast: () => {
      option.setTypeParameterList((before) => [
        ...before,
        { name: "新たな型パラメータの名前", typePartId: randomTypePartId() },
      ]);
    },
  });
};

const randomTypePartId = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((e) => e.toString(16).padStart(2, "0"))
    .join("") as d.TypePartId;

const bodyValue = (
  context: Pick<
    UseDefinyAppResult,
    "jump" | "language" | "typePartResource" | "typePartIdListInProjectResource"
  > & { projectId: d.ProjectId },
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
              type: { typePartId: d.Int32.typePartId, parameter: [] },
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
  > & { projectId: d.ProjectId },
  patternList: ReadonlyArray<d.Pattern>,
  setPatternList: (
    func: (prev: ReadonlyArray<d.Pattern>) => ReadonlyArray<d.Pattern>
  ) => void
): CommonValue => {
  return listValue({
    items: patternList.map((pattern, index) =>
      patternValue(context, pattern, (func) => {
        setPatternList((prev) => listUpdateAt(prev, index, func));
      })
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
  > & { projectId: d.ProjectId },
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
        value: textValue({
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
            }),
          pattern.parameter,
          () => {
            setPattern((prevPattern) => ({
              name: prevPattern.name,
              description: prevPattern.description,
              parameter: d.Maybe.Just({
                typePartId: d.Int32.typePartId,
                parameter: [],
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
  > & { projectId: d.ProjectId },
  memberList: ReadonlyArray<d.Member>,
  setMemberList: (
    func: (prev: ReadonlyArray<d.Member>) => ReadonlyArray<d.Member>
  ) => void
): CommonValue => {
  return listValue({
    items: memberList.map((member, index) =>
      memberValue(context, member, (func) => {
        setMemberList((prev) => listUpdateAt(prev, index, func));
      })
    ),
    addInLast: () => {
      setMemberList((prev) => [
        ...prev,
        {
          name: "newMember",
          description: "",
          type: { typePartId: d.Int32.typePartId, parameter: [] },
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
  > & { projectId: d.ProjectId },
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
        value: textValue({
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
        }),
      },
    ],
  });
};

const typePartBodyKernelValueList: ReadonlyArray<d.TypePartBodyKernel> = [
  "Function",
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
        name: "Function",
        onSelect: () => {
          setTypePartBodyKernel(d.TypePartBodyKernel.Function);
        },
      },
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
