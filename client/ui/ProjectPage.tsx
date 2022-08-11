import * as React from "react";
import * as d from "../../localData";
import {
  CommonValue,
  accountIdValue,
  buttonValue,
  idValue,
  imageValue,
  listValue,
  multiLineTextValue,
  oneLineTextValue,
  productValue,
  timeValue,
  typePartIdValue,
} from "../editor/common";
import { ListItem, listItem } from "../editor/list";
import { Editor } from "./Editor";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";

export type Props = Pick<
  UseDefinyAppResult,
  | "projectResource"
  | "accountResource"
  | "addTypePart"
  | "typePartIdListInProjectResource"
  | "typePartResource"
  | "generateCode"
  | "outputCode"
> & {
  readonly projectId: d.ProjectId;
  readonly language: d.Language;
};

export const ProjectPage: React.FC<Props> = (props) => {
  const addTypePart = props.addTypePart;
  const addTypePartInProject = React.useCallback(
    (): void =>
      addTypePart({ projectId: props.projectId, language: props.language }),
    [addTypePart, props.projectId, props.language]
  );
  const [partList, setPartList] = React.useState<ReadonlyArray<d.Part>>([]);

  React.useEffect(() => {
    props.projectResource.forciblyRequestToServer(props.projectId);
    props.typePartIdListInProjectResource.forciblyRequestToServer(
      props.projectId
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.projectId]);

  const projectState = props.projectResource.getFromMemoryCache(
    props.projectId
  );
  const typePartIdListInProject =
    props.typePartIdListInProjectResource.getFromMemoryCache(props.projectId);
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
          value: { onChange: undefined, text: project.name },
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
            value: idValue({
              id: props.projectId,
            }),
          },
          {
            name: "型パーツ",
            value: typePartListValue(typePartIdListInProject, {
              addTypePartInProject,
              language: props.language,
              typePartResource: props.typePartResource,
            }),
          },
          {
            name: "パーツ",
            value: partListValue(partList, setPartList, props.projectId),
          },
          {
            name: "コード生成",
            value: buttonValue({
              text: "コードを生成する",
              onClick: () => {
                props.generateCode(props.projectId);
              },
            }),
          },
          {
            name: "出力されたコード",
            value: outputCodeToText({
              language: props.language,
              outputCode: props.outputCode,
              typePartResource: props.typePartResource,
            }),
          },
        ],
      }}
    />
  );
};

const typePartListValue = (
  typePartIdListInProject:
    | d.ResourceState<ReadonlyArray<d.TypePartId>>
    | undefined,
  option: Pick<UseDefinyAppResult, "typePartResource"> & {
    readonly addTypePartInProject: () => void;
    readonly language: d.Language;
  }
): CommonValue => {
  if (typePartIdListInProject === undefined) {
    return oneLineTextValue({ text: "取得準備中……", onChange: undefined });
  }
  if (typePartIdListInProject._ === "Deleted") {
    return oneLineTextValue({
      text: "削除されたのか, 存在しない",
      onChange: undefined,
    });
  }
  if (typePartIdListInProject._ === "Unknown") {
    return oneLineTextValue({
      text: "取得に失敗しました",
      onChange: undefined,
    });
  }
  if (typePartIdListInProject._ === "Requesting") {
    return oneLineTextValue({ text: "取得中", onChange: undefined });
  }
  return listValue({
    items: typePartIdListInProject.dataWithTime.data.map(
      typePartIdToListItem({
        typePartResource: option.typePartResource,
        language: option.language,
      })
    ),
    addInLast: option.addTypePartInProject,
  });
};

const typePartIdToListItem =
  (
    option: Pick<UseDefinyAppResult, "typePartResource"> & {
      readonly language: d.Language;
    }
  ) =>
  (typePartId: d.TypePartId): ListItem => {
    const typePart = option.typePartResource.getFromMemoryCache(typePartId);
    return listItem(
      typePartIdValue({
        canEdit: false,
        typePartId,
        typePartResource: option.typePartResource,

        language: option.language,
      }),
      typePart?._ === "Loaded" ? typePart.dataWithTime.data.name : ""
    );
  };

const outputCodeToText = (
  option: Pick<UseDefinyAppResult, "typePartResource" | "outputCode"> & {
    readonly language: d.Language;
  }
): CommonValue => {
  switch (option.outputCode.tag) {
    case "notGenerated":
      return oneLineTextValue({
        text: "まだ生成していない",
        onChange: undefined,
      });
    case "generating":
      return oneLineTextValue({ text: "生成中", onChange: undefined });
    case "error":
      return oneLineTextValue({
        text: "生成に失敗 " + option.outputCode.errorMessage,
        onChange: undefined,
      });
    case "errorWithTypePartId": {
      return listValue({
        items: option.outputCode.messageList.map((typePartIdAndMessage) => {
          const errorTypePartListItem = typePartIdToListItem({
            typePartResource: option.typePartResource,

            language: option.language,
          })(typePartIdAndMessage.typePartId);
          return listItem(
            productValue({
              items: [
                {
                  name: "message",
                  value: oneLineTextValue({
                    text: typePartIdAndMessage.message,
                    onChange: undefined,
                  }),
                },
                { name: "at", value: errorTypePartListItem.commonValue },
              ],
            }),
            errorTypePartListItem.searchText
          );
        }),
      });
    }
    case "generated":
      return productValue({
        items: [
          {
            name: "TypeScript",
            value: multiLineTextValue({
              text: option.outputCode.typeScript,
              onChange: undefined,
            }),
          },
        ],
      });
  }
};

const partListValue = (
  partList: ReadonlyArray<d.Part>,
  setPartList: React.Dispatch<React.SetStateAction<ReadonlyArray<d.Part>>>,
  projectId: d.ProjectId
): CommonValue => {
  return listValue({
    items: partList.map(
      (part): ListItem => ({
        commonValue: productValue({
          headItem: {
            name: "name",
            value: { text: part.name, onChange: undefined },
          },
          items: [
            {
              name: "description",
              value: multiLineTextValue({
                text: part.description,
                onChange: undefined,
              }),
            },
            {
              name: "type",
              value: oneLineTextValue({
                text: "型の編集はもう少しあと",
                onChange: undefined,
              }),
            },
            {
              name: "expr",
              value: oneLineTextValue({
                text: "式の編集はもう少しあと",
                onChange: undefined,
              }),
            },
          ],
        }),
        searchText: part.name,
      })
    ),
    addInLast: () => {
      setPartList(
        (beforeList: ReadonlyArray<d.Part>): ReadonlyArray<d.Part> => {
          return [
            ...beforeList,
            {
              id: d.PartId.fromString("サーバー内で生成したほうが良さそうなID"),
              name: "SamplePart",
              description: "",
              expr: d.Expr.Int32Literal(0),
              projectId,
              type: d.Type.helper({
                input: d.Maybe.Nothing(),
                output: d.DataTypeOrDataTypeParameter.DataType({
                  typePartId: d.Int32.typePartId,
                  arguments: [],
                }),
              }),
            },
          ];
        }
      );
    },
  });
};
