import * as React from "react";
import * as d from "../data";
import { Editor, Props } from "../client/ui/Editor";
import { Meta, Story } from "@storybook/react";
import {
  imageValue,
  listValue,
  numberValue,
  productValue,
  projectIdValue,
  sumValue,
  textValue,
  timeValue,
  typePartIdValue,
} from "../client/editor/common";
import {
  project1,
  project1Id,
  project2Id,
  projectResource,
  typePart1Id,
  typePartResource,
} from "./mockData";
import { ArgType } from "@storybook/addons";
import type { Item } from "../client/editor/product";
import { UseDefinyAppResult } from "../client/hook/useDefinyApp";
import { action } from "@storybook/addon-actions";

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
        iconHash: "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73" as d.ImageHash,
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
          value: textValue({
            text: "作成者の名前",
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
          value: textValue({
            text: "パーツのリストを表示したい",
          }),
        },
        {
          name: "型パーツ",
          value: listValue({
            items: [
              typePartIdValue({
                canEdit: false,
                typePartId: typePart1Id,
                jump: props.onJump,
                language: props.language,
                typePartResource,
              }),
              typePartIdValue({
                canEdit: false,
                typePartId: typePart1Id,
                jump: props.onJump,
                language: props.language,
                typePartResource,
              }),
              typePartIdValue({
                canEdit: false,
                typePartId: typePart1Id,
                jump: props.onJump,
                language: props.language,
                typePartResource,
              }),
            ],
          }),
        },
        {
          name: "プロジェクトID",
          value: { type: "text", value: { text: "ffffffff" } },
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
          value: textValue({
            onChange: action("editDescription"),
            text:
              "DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる",
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
              typePartIdValue({
                canEdit: false,
                typePartId: typePart1Id,
                jump: props.onJump,
                language: props.language,
                typePartResource,
              }),
              typePartIdValue({
                canEdit: false,
                typePartId: typePart1Id,
                jump: props.onJump,
                language: props.language,
                typePartResource,
              }),
              typePartIdValue({
                canEdit: false,
                typePartId: typePart1Id,
                jump: props.onJump,
                language: props.language,
                typePartResource,
              }),
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
          value: textValue({
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
                projectIdValue({
                  canEdit: false,
                  projectId: project1Id,
                  jump: props.onJump,
                  language: props.language,
                  projectResource,
                }),
                projectIdValue({
                  canEdit: false,
                  projectId: project2Id,
                  jump: props.onJump,
                  language: props.language,
                  projectResource,
                }),
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
              numberValue({ canEdit: true, value: 0 }),
              numberValue({ canEdit: true, value: 1 }),
              numberValue({ canEdit: true, value: 2 }),
              numberValue({ canEdit: true, value: 3 }),
            ],
          }),
        },
        {
          name: "文字のリスト",
          value: listValue({
            isDirectionColumn: true,
            items: [
              textValue({ text: "React" }),
              textValue({ text: "Vue" }),
              textValue({ text: "Angular" }),
              textValue({ text: "Elm" }),
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
        value: { text: "直積の入れ子" },
      },
      items: [
        {
          name: "直積 in 直積",
          value: productValue({
            items: [
              {
                name: "name",
                value: textValue({ text: "入れ子の名前" }),
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
              productValue({
                items: [
                  {
                    name: "name",
                    value: textValue({
                      text: "入れ子の名前A",
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
              productValue({
                items: [
                  {
                    name: "name",
                    value: textValue({ text: "入れ子の名前B" }),
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
              productValue({
                items: [
                  {
                    name: "name",
                    value: textValue({
                      text: "入れ子の名前C",
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
              value: textValue({
                text: valueList[selectedIndex] ?? "?",
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
