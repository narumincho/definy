import * as React from "react";
import * as d from "../data";
import { Editor, Props } from "../client/ui/Editor";
import { Meta, Story } from "@storybook/react";
import {
  getAccount,
  getProject,
  project1,
  project1Id,
  project2Id,
} from "./mockData";
import { ArgType } from "@storybook/addons";
import { fullScreen } from "../.storybook/decorators";

const argTypes: Record<string, ArgType> = {};

const meta: Meta = {
  title: "Editor",
  component: Editor,
  argTypes,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

type ControlAndActionProps = Pick<
  Props,
  "language" | "onJump" | "onRequestAccount" | "onRequestProject"
>;

export const Project: Story<ControlAndActionProps> = (props) => (
  <Editor
    productType={{
      headItem: {
        name: "プロジェクト名",
        hasIcon: true,
        type: { tag: "text", textType: { canEdit: false } },
      },
      items: [
        {
          name: "カバー画像",
          type: { tag: "image", imageType: { canEdit: false } },
        },
        {
          name: "作成者",
          type: { tag: "text", textType: { canEdit: false } },
        },
        {
          name: "作成日時",
          type: { tag: "time", timeType: { canEdit: false } },
        },
        {
          name: "パーツ",
          type: { tag: "text", textType: { canEdit: false } },
        },
        {
          name: "型パーツ",
          type: { tag: "text", textType: { canEdit: false } },
        },
        {
          name: "プロジェクトID",
          type: { tag: "text", textType: { canEdit: false } },
        },
      ],
    }}
    product={{
      headItem: {
        value: { type: "text", value: "やあ" },
        iconHash: "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73" as d.ImageHash,
      },
      items: [
        {
          type: "image",
          value: {
            alternativeText: "プロジェクトの画像",
            value: project1.imageHash,
          },
        },
        { type: "text", value: "作成者の名前" },
        { type: "time", value: { day: 20001, millisecond: 1234 } },
        { type: "text", value: "パーツのリストを表示したい" },
        { type: "text", value: "型パーツのリストを表示したい" },
        { type: "text", value: "ffffffff" },
      ],
    }}
    getAccount={getAccount}
    language={props.language}
    onJump={props.onJump}
    onRequestAccount={props.onRequestAccount}
    onRequestProject={props.onRequestProject}
    getProject={getProject}
  />
);

export const TypePart: Story<ControlAndActionProps> = (props) => (
  <Editor
    productType={{
      headItem: {
        name: "name",
        type: { tag: "text", textType: { canEdit: true } },
        hasIcon: false,
      },
      items: [
        {
          name: "description",
          type: { tag: "text", textType: { canEdit: true } },
        },
        {
          name: "attribute",
          type: { tag: "sum", sumType: { valueList: ["Just", "Nothing"] } },
        },
        {
          name: "body",
          type: {
            tag: "sum",
            sumType: { valueList: ["Product", "Sum", "Kernel"] },
          },
        },
        {
          name: "使用しているところ",
          type: {
            tag: "list",
            listType: {
              elementType: { tag: "text", textType: { canEdit: false } },
            },
          },
        },
      ],
    }}
    product={{
      headItem: {
        value: { type: "text", value: "Location" },
      },
      items: [
        {
          type: "text",
          value:
            "DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる",
        },
        {
          type: "sum",
          value: { index: 1 },
        },
        {
          type: "sum",
          value: { index: 1 },
        },
        {
          type: "list",
          value: {
            items: [
              { type: "text", value: "使用しているところA" },
              { type: "text", value: "使用しているところB" },
              { type: "text", value: "使用しているところC" },
            ],
          },
        },
      ],
    }}
    getAccount={getAccount}
    language={props.language}
    onJump={props.onJump}
    onRequestAccount={props.onRequestAccount}
    onRequestProject={props.onRequestProject}
    getProject={getProject}
  />
);

export const Home: Story<ControlAndActionProps> = (props) => (
  <Editor
    productType={{
      items: [
        {
          name: "検索",
          type: { tag: "text", textType: { canEdit: true } },
        },
        {
          name: "プロジェクト",
          type: {
            tag: "list",
            listType: {
              elementType: { tag: "project", projectType: { canEdit: false } },
            },
          },
        },
      ],
    }}
    product={{
      items: [
        { type: "text", value: "検索語句" },
        {
          type: "list",
          value: {
            items: [
              { type: "project", value: project1Id },
              { type: "project", value: project2Id },
            ],
          },
        },
      ],
    }}
    getAccount={getAccount}
    language={props.language}
    onJump={props.onJump}
    onRequestAccount={props.onRequestAccount}
    onRequestProject={props.onRequestProject}
    getProject={getProject}
  />
);

export const List: Story<ControlAndActionProps> = (props) => (
  <Editor
    productType={{
      items: [
        {
          name: "数値のリスト",
          type: {
            tag: "list",
            listType: {
              elementType: { tag: "number", numberType: { canEdit: true } },
            },
          },
        },
        {
          name: "文字のリスト",
          type: {
            tag: "list",
            listType: {
              elementType: { tag: "text", textType: { canEdit: true } },
            },
          },
        },
      ],
    }}
    product={{
      items: [
        {
          type: "list",
          value: {
            items: [
              { type: "number", value: 0 },
              { type: "number", value: 1 },
              { type: "number", value: 2 },
              { type: "number", value: 3 },
            ],
          },
        },
        {
          type: "list",
          value: {
            items: [
              { type: "text", value: "React" },
              { type: "text", value: "Vue" },
              { type: "text", value: "Angular" },
            ],
          },
        },
      ],
    }}
    getAccount={getAccount}
    language={props.language}
    onJump={props.onJump}
    onRequestAccount={props.onRequestAccount}
    onRequestProject={props.onRequestProject}
    getProject={getProject}
  />
);

export const NestProduct: Story<ControlAndActionProps> = (props) => (
  <Editor
    productType={{
      headItem: {
        name: "name",
        hasIcon: false,
        type: { tag: "text", textType: { canEdit: false } },
      },
      items: [
        {
          name: "直積 in 直積",
          type: {
            tag: "product",
            productType: {
              items: [
                {
                  name: "name",
                  type: { tag: "text", textType: { canEdit: true } },
                },
                {
                  name: "age",
                  type: { tag: "number", numberType: { canEdit: true } },
                },
              ],
            },
          },
        },
        {
          name: "直積 in リスト",
          type: {
            tag: "list",
            listType: {
              elementType: {
                tag: "product",
                productType: {
                  items: [
                    {
                      name: "name",
                      type: { tag: "text", textType: { canEdit: true } },
                    },
                    {
                      name: "age",
                      type: { tag: "number", numberType: { canEdit: true } },
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    }}
    product={{
      headItem: {
        value: { type: "text", value: "直積の入れ子" },
      },
      items: [
        {
          type: "product",
          value: {
            items: [
              { type: "text", value: "入れ子の名前" },
              { type: "number", value: 22 },
            ],
          },
        },
        {
          type: "list",
          value: {
            items: [
              {
                type: "product",
                value: {
                  items: [
                    { type: "text", value: "入れ子の名前A" },
                    { type: "number", value: 1 },
                  ],
                },
              },
              {
                type: "product",
                value: {
                  items: [
                    { type: "text", value: "入れ子の名前B" },
                    { type: "number", value: 12 },
                  ],
                },
              },
              {
                type: "product",
                value: {
                  items: [
                    { type: "text", value: "入れ子の名前C" },
                    { type: "number", value: 123 },
                  ],
                },
              },
            ],
          },
        },
      ],
    }}
    getAccount={getAccount}
    language={props.language}
    onJump={props.onJump}
    onRequestAccount={props.onRequestAccount}
    onRequestProject={props.onRequestProject}
    getProject={getProject}
  />
);
