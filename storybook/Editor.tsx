import * as React from "react";
import * as d from "../data";
import { Editor, Props } from "../client/ui/Editor";
import { Meta, Story } from "@storybook/react";
import {
  accountResource,
  project1,
  project1Id,
  project2Id,
  projectResource,
  typePart1Id,
  typePartResource,
} from "./mockData";
import { ArgType } from "@storybook/addons";

const argTypes: Record<string, ArgType> = {};

const meta: Meta = {
  title: "Editor",
  component: Editor,
  argTypes,
};
export default meta;

type ControlAndActionProps = Pick<
  Props,
  "language" | "onJump" | "onRequestDataOperation"
>;

export const Project: Story<ControlAndActionProps> = (props) => (
  <Editor
    product={{
      headItem: {
        name: "プロジェクト名",
        value: { canEdit: true, text: "やあ" },
        iconHash: "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73" as d.ImageHash,
      },
      items: [
        {
          name: "カバー画像",
          value: {
            type: "image",
            value: {
              canEdit: true,
              alternativeText: "プロジェクトの画像",
              value: project1.imageHash,
            },
          },
        },
        {
          name: "作成者",
          value: {
            type: "text",
            value: { canEdit: false, text: "作成者の名前" },
          },
        },
        {
          name: "作成日時",
          value: {
            type: "time",
            value: { time: { day: 20001, millisecond: 1234 }, canEdit: false },
          },
        },
        {
          name: "パーツ",
          value: {
            type: "text",
            value: { canEdit: false, text: "パーツのリストを表示したい" },
          },
        },
        {
          name: "型パーツ",
          value: {
            type: "list",
            value: {
              canEdit: true,
              items: [
                {
                  type: "typePartId",
                  value: { canEdit: false, typePartId: typePart1Id },
                },
                {
                  type: "typePartId",
                  value: { canEdit: false, typePartId: typePart1Id },
                },
                {
                  type: "typePartId",
                  value: { canEdit: false, typePartId: typePart1Id },
                },
              ],
            },
          },
        },
        {
          name: "プロジェクトID",
          value: { type: "text", value: { canEdit: false, text: "ffffffff" } },
        },
      ],
    }}
    accountResource={accountResource}
    projectResource={projectResource}
    typePartResource={typePartResource}
    language={props.language}
    onJump={props.onJump}
    onRequestDataOperation={props.onRequestDataOperation}
  />
);
Project.args = { language: d.Language.Japanese };

export const TypePart: Story<ControlAndActionProps> = (props) => (
  <Editor
    product={{
      headItem: {
        name: "name",
        value: { canEdit: true, text: "Location" },
      },
      items: [
        {
          name: "description",
          value: {
            type: "text",
            value: {
              canEdit: true,
              text:
                "DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる",
            },
          },
        },
        {
          name: "attribute",
          value: {
            type: "sum",
            value: { valueList: ["Just", "Nothing"], index: 1 },
          },
        },
        {
          name: "body",
          value: {
            type: "sum",
            value: { valueList: ["Product", "Sum", "Kernel"], index: 1 },
          },
        },
        {
          name: "使用しているところ",
          value: {
            type: "list",
            value: {
              canEdit: false,
              isDirectionColumn: false,
              items: [
                {
                  type: "typePartId",
                  value: { canEdit: false, typePartId: typePart1Id },
                },
                {
                  type: "typePartId",
                  value: { canEdit: false, typePartId: typePart1Id },
                },
                {
                  type: "typePartId",
                  value: { canEdit: false, typePartId: typePart1Id },
                },
              ],
            },
          },
        },
      ],
    }}
    accountResource={accountResource}
    projectResource={projectResource}
    typePartResource={typePartResource}
    language={props.language}
    onJump={props.onJump}
    onRequestDataOperation={props.onRequestDataOperation}
  />
);
TypePart.args = { language: d.Language.Japanese };

export const Home: Story<ControlAndActionProps> = (props) => (
  <Editor
    product={{
      items: [
        {
          name: "検索",
          value: { type: "text", value: { canEdit: true, text: "検索語句" } },
        },
        {
          name: "プロジェクト",
          value: {
            type: "list",
            value: {
              canEdit: false,
              isDirectionColumn: true,
              items: [
                {
                  type: "project",
                  value: { canEdit: false, projectId: project1Id },
                },
                {
                  type: "project",
                  value: { canEdit: false, projectId: project2Id },
                },
              ],
            },
          },
        },
      ],
    }}
    accountResource={accountResource}
    projectResource={projectResource}
    typePartResource={typePartResource}
    language={props.language}
    onJump={props.onJump}
    onRequestDataOperation={props.onRequestDataOperation}
  />
);
Home.args = { language: d.Language.Japanese };

export const List: Story<ControlAndActionProps> = (props) => (
  <Editor
    product={{
      items: [
        {
          name: "数値のリスト",
          value: {
            type: "list",
            value: {
              canEdit: true,
              isDirectionColumn: true,
              items: [
                { type: "number", value: { canEdit: true, value: 0 } },
                { type: "number", value: { canEdit: true, value: 1 } },
                { type: "number", value: { canEdit: true, value: 2 } },
                { type: "number", value: { canEdit: true, value: 3 } },
              ],
            },
          },
        },
        {
          name: "文字のリスト",
          value: {
            type: "list",
            value: {
              canEdit: true,
              isDirectionColumn: true,
              items: [
                { type: "text", value: { canEdit: true, text: "React" } },
                { type: "text", value: { canEdit: true, text: "Vue" } },
                { type: "text", value: { canEdit: true, text: "Angular" } },
                { type: "text", value: { canEdit: true, text: "Elm" } },
              ],
            },
          },
        },
      ],
    }}
    accountResource={accountResource}
    projectResource={projectResource}
    typePartResource={typePartResource}
    language={props.language}
    onJump={props.onJump}
    onRequestDataOperation={props.onRequestDataOperation}
  />
);
List.args = { language: d.Language.Japanese };

export const NestProduct: Story<ControlAndActionProps> = (props) => (
  <Editor
    product={{
      headItem: {
        name: "name",
        value: { canEdit: false, text: "直積の入れ子" },
      },
      items: [
        {
          name: "直積 in 直積",
          value: {
            type: "product",
            value: {
              items: [
                {
                  name: "name",
                  value: {
                    type: "text",
                    value: { canEdit: false, text: "入れ子の名前" },
                  },
                },
                {
                  name: "age",
                  value: {
                    type: "number",
                    value: { canEdit: false, value: 22 },
                  },
                },
              ],
            },
          },
        },
        {
          name: "直積 in リスト",
          value: {
            type: "list",
            value: {
              canEdit: false,
              isDirectionColumn: false,
              items: [
                {
                  type: "product",
                  value: {
                    items: [
                      {
                        name: "name",
                        value: {
                          type: "text",
                          value: { canEdit: false, text: "入れ子の名前A" },
                        },
                      },
                      {
                        name: "age",
                        value: {
                          type: "number",
                          value: { canEdit: false, value: 1 },
                        },
                      },
                    ],
                  },
                },
                {
                  type: "product",
                  value: {
                    items: [
                      {
                        name: "name",
                        value: {
                          type: "text",
                          value: { canEdit: false, text: "入れ子の名前B" },
                        },
                      },
                      {
                        name: "age",
                        value: {
                          type: "number",
                          value: { canEdit: false, value: 12 },
                        },
                      },
                    ],
                  },
                },
                {
                  type: "product",
                  value: {
                    items: [
                      {
                        name: "name",
                        value: {
                          type: "text",
                          value: { canEdit: false, text: "入れ子の名前C" },
                        },
                      },
                      {
                        name: "age",
                        value: {
                          type: "number",
                          value: { canEdit: false, value: 123 },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    }}
    accountResource={accountResource}
    projectResource={projectResource}
    typePartResource={typePartResource}
    language={props.language}
    onJump={props.onJump}
    onRequestDataOperation={props.onRequestDataOperation}
  />
);
NestProduct.args = { language: d.Language.Japanese };
