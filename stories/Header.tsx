import * as React from "react";
import * as d from "../data";
import { Header, Props } from "../client/ui/Header";
import { Meta, Story } from "@storybook/react";
import { ArgType } from "@storybook/addons";
import { fullScreen } from "../.storybook/decorators";

const argTypes: Record<
  keyof Pick<Props, "titleItemList" | "logInState" | "accountDict">,
  ArgType
> = {
  titleItemList: {
    control: null,
  },
  logInState: { control: null },
  accountDict: { control: null },
};

const meta: Meta = {
  title: "Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
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
    accountDict={new Map()}
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
        location: d.Location.Project("sample" as d.ProjectId),
      },
      {
        name: "サンプル型パーツ",
        location: d.Location.TypePart("sample" as d.TypePartId),
      },
    ]}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
  />
);
Title.args = {
  language: d.Language.Japanese,
};
