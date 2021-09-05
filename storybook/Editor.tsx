import * as React from "react";
import * as d from "../localData";
import { Editor, Props } from "../client/ui/Editor";
import { Meta, Story } from "@storybook/react";
import {
  imageValue,
  listValue,
  numberValue,
  oneLineTextValue,
  productValue,
  projectIdValue,
  sumValue,
  timeValue,
  typePartIdValue,
} from "../client/editor/common";
import {
  listTypePart,
  listTypePartId,
  project1,
  project1Id,
  project2,
  project2Id,
  projectResource,
  resultTypePart,
  resultTypePartId,
  typePart,
  typePart1Id,
  typePartResource,
} from "./mockData";
import { ArgType } from "@storybook/addons";
import type { Item } from "../client/editor/product";
import { UseDefinyAppResult } from "../client/hook/useDefinyApp";
import { action } from "@storybook/addon-actions";
import { listItem } from "../client/editor/list";

type ControlAndActionProps = {
  language: d.Language;
  onJump: UseDefinyAppResult["jump"];
};

const argTypes: Record<
  keyof Pick<ControlAndActionProps, "language" | "onJump">,
  ArgType
> = {
  language: {
    description: "storybook 用. 言語",
    defaultValue: d.Language.Japanese,
  },
  onJump: {
    description: "storybook 用. ページ移動をリクエストする",
    action: "onJump",
  },
};

const meta: Meta = {
  title: "Editor",
  component: Editor,
  argTypes,
};
export default meta;

export const Project: Story<ControlAndActionProps> = (props) => (
  <Editor
    product={{
      headItem: {
        name: "プロジェクト名",
        value: { onChange: action("editProjectName"), text: "やあ" },
        iconHash: d.ImageHash.fromString(
          "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73"
        ),
      },
      items: [
        {
          name: "カバー画像",
          value: imageValue({
            canEdit: true,
            alternativeText: "プロジェクトの画像",
            value: project1.imageHash,
          }),
        },
        {
          name: "作成者",
          value: oneLineTextValue({
            text: "作成者の名前",
            onChange: undefined,
          }),
        },
        {
          name: "作成日時",
          value: timeValue({
            time: { day: 20001, millisecond: 1234 },
            canEdit: false,
          }),
        },
        {
          name: "パーツ",
          value: oneLineTextValue({
            text: "パーツのリストを表示したい",
            onChange: undefined,
          }),
        },
        {
          name: "型パーツ",
          value: listValue({
            items: [
              listItem(
                typePartIdValue({
                  canEdit: false,
                  typePartId: typePart1Id,
                  jump: props.onJump,
                  language: props.language,
                  typePartResource,
                }),
                typePart.name
              ),
              listItem(
                typePartIdValue({
                  canEdit: false,
                  typePartId: listTypePartId,
                  jump: props.onJump,
                  language: props.language,
                  typePartResource,
                }),
                listTypePart.name
              ),
              listItem(
                typePartIdValue({
                  canEdit: false,
                  typePartId: resultTypePartId,
                  jump: props.onJump,
                  language: props.language,
                  typePartResource,
                }),
                resultTypePart.name
              ),
            ],
          }),
        },
        {
          name: "プロジェクトID",
          value: oneLineTextValue({
            text: "72262927b6ddb672bb86b296c03210a9",
            onChange: undefined,
          }),
        },
      ],
    }}
  />
);
Project.args = { language: d.Language.Japanese };

export const TypePart: Story<ControlAndActionProps> = (props) => (
  <Editor
    product={{
      headItem: {
        name: "name",
        value: { onChange: action("editName"), text: "Location" },
      },
      items: [
        {
          name: "description",
          value: oneLineTextValue({
            onChange: action("editDescription"),
            text: "definyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる",
          }),
        },
        {
          name: "attribute",
          value: sumValue({
            tagList: [
              { name: "Just", onSelect: action("attributeJust") },
              { name: "Nothing", onSelect: action("attributeNothing") },
            ],
            index: 1,
            value: undefined,
          }),
        },
        {
          name: "body",
          value: sumValue({
            tagList: [
              { name: "Sum", onSelect: action("bodySum") },
              { name: "Product", onSelect: action("bodyProduct") },
              { name: "Kernel", onSelect: action("bodyKernel") },
            ],
            index: 1,
            value: undefined,
          }),
        },
        {
          name: "使用しているところ",
          value: listValue({
            isDirectionColumn: false,
            items: [
              listItem(
                typePartIdValue({
                  canEdit: false,
                  typePartId: typePart1Id,
                  jump: props.onJump,
                  language: props.language,
                  typePartResource,
                }),
                typePart.name
              ),
              listItem(
                typePartIdValue({
                  canEdit: false,
                  typePartId: listTypePartId,
                  jump: props.onJump,
                  language: props.language,
                  typePartResource,
                }),
                listTypePart.name
              ),
              listItem(
                typePartIdValue({
                  canEdit: false,
                  typePartId: resultTypePartId,
                  jump: props.onJump,
                  language: props.language,
                  typePartResource,
                }),
                resultTypePart.name
              ),
            ],
          }),
        },
      ],
    }}
  />
);
TypePart.args = { language: d.Language.Japanese };

export const Home: Story<ControlAndActionProps> = (props) => (
  <Editor
    product={{
      items: [
        {
          name: "検索",
          value: oneLineTextValue({
            onChange: action("changeSearchText"),
            text: "検索語句",
          }),
        },
        {
          name: "プロジェクト",
          value: {
            type: "list",
            value: {
              isDirectionColumn: true,
              items: [
                listItem(
                  projectIdValue({
                    canEdit: false,
                    projectId: project1Id,
                    jump: props.onJump,
                    language: props.language,
                    projectResource,
                  }),
                  project1.name
                ),
                listItem(
                  projectIdValue({
                    canEdit: false,
                    projectId: project2Id,
                    jump: props.onJump,
                    language: props.language,
                    projectResource,
                  }),
                  project2.name
                ),
              ],
            },
          },
        },
      ],
    }}
  />
);
Home.args = { language: d.Language.Japanese };

export const List: Story<ControlAndActionProps> = () => (
  <Editor
    product={{
      items: [
        {
          name: "数値のリスト",
          value: listValue({
            isDirectionColumn: true,
            items: [
              listItem(numberValue({ canEdit: true, value: 0 }), "0"),
              listItem(numberValue({ canEdit: true, value: 1 }), "1"),
              listItem(numberValue({ canEdit: true, value: 2 }), "2"),
              listItem(numberValue({ canEdit: true, value: 3 }), "3"),
            ],
          }),
        },
        {
          name: "文字のリスト",
          value: listValue({
            isDirectionColumn: true,
            items: [
              listItem(
                oneLineTextValue({ text: "React", onChange: undefined }),
                "react"
              ),
              listItem(
                oneLineTextValue({ text: "Vue", onChange: undefined }),
                "vue"
              ),
              listItem(
                oneLineTextValue({ text: "Angular", onChange: undefined }),
                "angular"
              ),
              listItem(
                oneLineTextValue({ text: "Elm", onChange: undefined }),
                "elm"
              ),
            ],
          }),
        },
      ],
    }}
  />
);
List.args = { language: d.Language.Japanese };

export const NestProduct: Story<ControlAndActionProps> = () => (
  <Editor
    product={{
      headItem: {
        name: "name",
        value: { text: "直積の入れ子", onChange: undefined },
      },
      items: [
        {
          name: "直積 in 直積",
          value: productValue({
            items: [
              {
                name: "name",
                value: oneLineTextValue({
                  text: "入れ子の名前",
                  onChange: undefined,
                }),
              },
              {
                name: "age",
                value: numberValue({ canEdit: false, value: 22 }),
              },
            ],
          }),
        },
        {
          name: "直積 in リスト",
          value: listValue({
            isDirectionColumn: false,
            items: [
              listItem(
                productValue({
                  items: [
                    {
                      name: "name",
                      value: oneLineTextValue({
                        text: "入れ子の名前A",
                        onChange: undefined,
                      }),
                    },
                    {
                      name: "age",
                      value: numberValue({
                        canEdit: false,
                        value: 1,
                      }),
                    },
                  ],
                }),
                "a"
              ),
              listItem(
                productValue({
                  items: [
                    {
                      name: "name",
                      value: oneLineTextValue({
                        text: "入れ子の名前B",
                        onChange: undefined,
                      }),
                    },
                    {
                      name: "age",
                      value: numberValue({
                        canEdit: false,
                        value: 12,
                      }),
                    },
                  ],
                }),
                "b"
              ),
              listItem(
                productValue({
                  items: [
                    {
                      name: "name",
                      value: oneLineTextValue({
                        text: "入れ子の名前C",
                        onChange: undefined,
                      }),
                    },
                    {
                      name: "age",
                      value: numberValue({
                        canEdit: false,
                        value: 123,
                      }),
                    },
                  ],
                }),
                "c"
              ),
            ],
          }),
        },
      ],
    }}
  />
);
NestProduct.args = { language: d.Language.Japanese };

const valueList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

const SumComponent: React.VFC<Record<string, string>> = () => {
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
  return (
    <Editor
      product={{
        items: Array.from(
          { length: 10 },
          (_, i): Item => ({
            name: `${i}このタグ`,
            value: sumValue({
              index: selectedIndex,
              tagList: valueList.slice(0, i).map((name, index) => ({
                name,
                onSelect: () => {
                  setSelectedIndex(index);
                },
              })),
              value: oneLineTextValue({
                text: valueList[selectedIndex] ?? "?",
                onChange: undefined,
              }),
            }),
          })
        ),
      }}
    />
  );
};

export const Sum: Story<Record<string, string>> = () => {
  return <SumComponent />;
};
Sum.argTypes = {};
