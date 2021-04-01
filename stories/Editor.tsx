import * as React from "react";
import { Editor, Props } from "../client/ui/Editor";
import { Meta, Story } from "@storybook/react";
import { ArgType } from "@storybook/addons";

const argTypes: Record<string, ArgType> = {};

const meta: Meta = {
  title: "Editor",
  component: Editor,
  argTypes,
};
export default meta;

export const Project: Story<never> = () => (
  <Editor
    headItem={{
      name: "プロジェクト名",
      typeAndValue: { type: "text", value: "やあ" },
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
    ]}
  />
);

export const TypePart: Story<never> = () => (
  <Editor
    headItem={{
      name: "名前",
      typeAndValue: { type: "text", value: "Location" },
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
  />
);
