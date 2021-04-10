import * as React from "react";
import * as d from "../data";
import { Editor, Props } from "../client/ui/Editor";
import { Meta, Story } from "@storybook/react";
import { getAccount, getProject, project1Id, project2Id } from "./mockData";
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
  "language" | "onJump" | "onRequestAccount" | "onRequestProject"
>;

export const Project: Story<ControlAndActionProps> = (props) => (
  <Editor
    product={{
      headItem: {
        name: "プロジェクト名",
        type: { tag: "text" },
        value: { type: "text", value: "やあ" },
        iconHash: "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73" as d.ImageHash,
      },
      items: [
        {
          name: "作成者",
          type: { tag: "text" },
          value: { type: "text", value: "作成者の名前" },
        },
        {
          name: "作成日時",
          type: { tag: "text" },
          value: { type: "text", value: "2021-04-01" },
        },
        {
          name: "パーツ",
          type: { tag: "text" },
          value: { type: "text", value: "パーツのリストを表示したい" },
        },
        {
          name: "型パーツ",
          type: { tag: "text" },
          value: { type: "text", value: "型パーツのリストを表示したい" },
        },
        {
          name: "プロジェクトID",
          type: { tag: "text" },
          value: { type: "text", value: "ffffffff" },
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

export const TypePart: Story<ControlAndActionProps> = (props) => (
  <Editor
    product={{
      headItem: {
        name: "name",
        type: { tag: "text" },
        value: { type: "text", value: "Location" },
      },
      items: [
        {
          name: "description",
          type: { tag: "text" },
          value: {
            type: "text",
            value:
              "DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる",
          },
        },
        {
          name: "attribute",
          type: { tag: "select", valueList: ["Just", "Nothing"] },
          value: {
            type: "select",
            index: 1,
          },
        },
        {
          name: "body",
          type: { tag: "select", valueList: ["Product", "Sum", "Kernel"] },
          value: {
            type: "select",
            index: 1,
          },
        },
        {
          name: "使用しているところ",
          type: { tag: "text" },
          value: {
            type: "text",
            value: "使用しているところのリストを表示したい",
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
    product={{
      items: [
        {
          name: "検索",
          type: { tag: "text" },
          value: { type: "text", value: "検索語句" },
        },
        {
          name: "プロジェクト",
          type: { tag: "list", element: { tag: "project" } },
          value: {
            type: "list",
            value: {
              items: [
                { type: "project", value: project1Id },
                { type: "project", value: project2Id },
              ],
            },
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
    product={{
      items: [
        {
          name: "数値のリスト",
          type: { tag: "list", element: { tag: "number" } },
          value: {
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
        },
        {
          name: "文字のリスト",
          type: { tag: "list", element: { tag: "text" } },
          value: {
            type: "list",
            value: {
              items: [
                { type: "text", value: "React" },
                { type: "text", value: "Vue" },
                { type: "text", value: "Angular" },
              ],
            },
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
