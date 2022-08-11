import * as React from "react";
import * as d from "../localData";
import { Meta, Story } from "@storybook/react";
import { Props, SettingPage } from "../client/ui/SettingPage";
import { accountResource } from "./mockData";

const meta: Meta = {
  title: "SettingPage",
  component: SettingPage,
};
export default meta;

type ControlAndActionProps = Pick<Props, "language" | "onLogOut">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <SettingPage
    language={props.language}
    accountResource={accountResource}
    logInState={{ _: "Guest" }}
    onLogOut={props.onLogOut}
  />
);
Default.args = {
  language: d.Language.Japanese,
};
