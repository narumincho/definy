import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { Props, SettingPage } from "../client/ui/SettingPage";
import { fullScreen } from "../.storybook/decorators";
import { getAccount } from "./mockData";

const meta: Meta = {
  title: "SettingPage",
  component: SettingPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

type ControlAndActionProps = Pick<
  Props,
  "language" | "onJump" | "onClickLogoutButton"
>;

export const Default: Story<ControlAndActionProps> = (props) => (
  <SettingPage
    language={props.language}
    getAccount={getAccount}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onClickLogoutButton={props.onClickLogoutButton}
  />
);
Default.args = {
  language: d.Language.Japanese,
};
