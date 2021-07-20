import * as React from "react";
import * as d from "../../localData";
import {
  CommonValue,
  accountIdValue,
  buttonValue,
  imageValue,
  listValue,
  multiLineTextValue,
  oneLineTextValue,
  productValue,
  timeValue,
  typePartIdValue,
  typeValue,
} from "../editor/common";
import { ListItem, listItem } from "../editor/list";
import { Editor } from "./Editor";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";

export type Props = Pick<
  UseDefinyAppResult,
  | "projectResource"
  | "accountResource"
  | "language"
  | "addTypePart"
  | "typePartIdListInProjectResource"
  | "typePartResource"
  | "generateCode"
  | "outputCode"
> & {
  readonly projectId: d.ProjectId;
  readonly onJump: UseDefinyAppResult["jump"];
};

export const ProjectPage: React.VFC<Props> = (props) => {
  const addTypePart = props.addTypePart;
  const addTypePartInProject = React.useCallback(
    (): void => addTypePart(props.projectId),
    [addTypePart, props.projectId]
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
            value: oneLineTextValue({
              text: props.projectId,
              onChange: undefined,
            }),
          },
          {
            name: "型パーツ",
            value: typePartListValue(typePartIdListInProject, {
              addTypePartInProject,
              jump: props.onJump,
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
            value: outputCodeToText(props.outputCode),
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
  option: Pick<UseDefinyAppResult, "typePartResource" | "jump" | "language"> & {
    addTypePartInProject: () => void;
  }
): CommonValue => {
  if (typePartIdListInProject === undefined) {
    return oneLineTextValue({ text: "取得準備中……" });
  }
  if (typePartIdListInProject._ === "Deleted") {
    return oneLineTextValue({ text: "削除されたのか, 存在しない" });
  }
  if (typePartIdListInProject._ === "Unknown") {
    return oneLineTextValue({ text: "取得に失敗しました" });
  }
  if (typePartIdListInProject._ === "Requesting") {
    return oneLineTextValue({ text: "取得中" });
  }
  return listValue({
    items: typePartIdListInProject.dataWithTime.data.map(
      typePartIdToListItem({
        typePartResource: option.typePartResource,
        jump: option.jump,
        language: option.language,
      })
    ),
    addInLast: option.addTypePartInProject,
  });
};

const typePartIdToListItem =
  (
    option: Pick<UseDefinyAppResult, "typePartResource" | "jump" | "language">
  ) =>
  (typePartId: d.TypePartId): ListItem => {
    const typePart = option.typePartResource.getFromMemoryCache(typePartId);
    return listItem(
      typePartIdValue({
        canEdit: false,
        typePartId,
        typePartResource: option.typePartResource,
        jump: option.jump,
        language: option.language,
      }),
      typePart?._ === "Loaded" ? typePart.dataWithTime.data.name : ""
    );
  };

const outputCodeToText = (
  outputCode: UseDefinyAppResult["outputCode"]
): CommonValue => {
  switch (outputCode.tag) {
    case "notGenerated":
      return oneLineTextValue({ text: "まだ生成していない" });
    case "generating":
      return oneLineTextValue({ text: "生成中" });
    case "error":
      return oneLineTextValue({
        text: "生成に失敗 " + outputCode.errorMessage,
      });
    case "generated":
      return productValue({
        items: [
          {
            name: "TypeScript",
            value: multiLineTextValue({ text: outputCode.typeScript }),
          },
          {
            name: "JavaScript",
            value: multiLineTextValue({ text: outputCode.javaScript }),
          },
          {
            name: "Elm",
            value: multiLineTextValue({ text: outputCode.elm }),
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
            value: { text: part.name },
          },
          items: [
            {
              name: "description",
              value: multiLineTextValue({
                text: part.description,
              }),
            },
            {
              name: "type",
              value: oneLineTextValue({ text: "型の編集はもう少しあと" }),
            },
            {
              name: "expr",
              value: oneLineTextValue({ text: "式の編集はもう少しあと" }),
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
                typePartId: d.Int32.typePartId,
                parameter: [],
              }),
            },
          ];
        }
      );
    },
  });
};
