import * as React from "react";
import * as d from "../data";
import { Header, Props } from "../client/ui/Header";
import { Meta, Story } from "@storybook/react";
import { ArgType } from "@storybook/addons";
import { accountResource } from "./mockData";

const argTypes: Record<
  keyof Pick<Props, "titleItemList" | "logInState">,
  ArgType
> = {
  titleItemList: {
    control: null,
  },
  logInState: { control: null },
};

const meta: Meta = {
  title: "Header",
  component: Header,
  argTypes,
};
export default meta;

type ControlAndActionProps = Pick<
  Props,
  "language" | "onJump" | "onLogInButtonClick"
>;

export const Default: Story<ControlAndActionProps> = (props) => (
  <Header
    language={props.language}
    titleItemList={[]}
    accountResource={accountResource}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
  />
);
Default.args = {
  language: d.Language.Japanese,
};

export const Title: Story<ControlAndActionProps> = (props) => (
  <Header
    language={props.language}
    titleItemList={[
      {
        name: "サンプルプロジェクト",
        location: d.Location.Project(d.ProjectId.fromString("sample")),
      },
      {
        name: "サンプル型パーツ",
        location: d.Location.TypePart(d.TypePartId.fromString("sample")),
      },
    ]}
    accountResource={accountResource}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
  />
);
Title.args = {
  language: d.Language.Japanese,
};
