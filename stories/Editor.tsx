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
    headItem={{
      item: {
        name: "プロジェクト名",
        typeAndValue: { type: "text", value: "やあ" },
      },
      iconHash: "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73" as d.ImageHash,
    }}
    items={[
      {
        name: "作成者",
        typeAndValue: { type: "text", value: "作成者の名前" },
      },
      {
        name: "作成日時",
        typeAndValue: { type: "text", value: "2021-04-01" },
      },
      {
        name: "パーツ",
        typeAndValue: { type: "text", value: "パーツのリストを表示したい" },
      },
      {
        name: "型パーツ",
        typeAndValue: { type: "text", value: "型パーツのリストを表示したい" },
      },
      {
        name: "プロジェクトID",
        typeAndValue: { type: "text", value: "ffffffff" },
      },
    ]}
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
    headItem={{
      item: {
        name: "name",
        typeAndValue: { type: "text", value: "Location" },
      },
    }}
    items={[
      {
        name: "description",
        typeAndValue: {
          type: "text",
          value:
            "DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる",
        },
      },
      {
        name: "attribute",
        typeAndValue: {
          type: "select",
          valueList: ["Just", "Nothing"],
          index: 1,
        },
      },
      {
        name: "body",
        typeAndValue: {
          type: "select",
          valueList: ["Product", "Sum", "Kernel"],
          index: 1,
        },
      },
      {
        name: "使用しているところ",
        typeAndValue: {
          type: "text",
          value: "使用しているところのリストを表示したい",
        },
      },
    ]}
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
    items={[
      {
        name: "検索",
        typeAndValue: { type: "text", value: "検索語句" },
      },
      {
        name: "プロジェクト",
        typeAndValue: { type: "listProject", value: [project1Id, project2Id] },
      },
    ]}
    getAccount={getAccount}
    language={props.language}
    onJump={props.onJump}
    onRequestAccount={props.onRequestAccount}
    onRequestProject={props.onRequestProject}
    getProject={getProject}
  />
);
