import * as React from "react";
import * as d from "../data";
import { AccountPage, Props } from "../client/ui/AccountPage";
import { Meta, Story } from "@storybook/react";
import { account1Id, getAccount, getProject } from "./mockData";
import { fullScreen } from "../.storybook/decorators";

const meta: Meta = {
  title: "AccountPage",
  component: AccountPage,
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

export const Default: Story<ControlAndActionProps> = (props) => (
  <AccountPage
    accountId={account1Id}
    getAccount={getAccount}
    getProject={getProject}
    onJump={props.onJump}
    language={props.language}
    onRequestAccount={props.onRequestAccount}
    onRequestProject={props.onRequestProject}
  />
);
Default.args = {
  language: d.Language.Japanese,
};
