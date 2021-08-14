import * as React from "react";
import * as d from "../localData";
import { AccountPage, Props } from "../client/ui/AccountPage";
import { Meta, Story } from "@storybook/react";
import {
  account1Id,
  accountResource,
  projectResource,
  typePartResource,
} from "./mockData";

const meta: Meta = {
  title: "AccountPage",
  component: AccountPage,
};
export default meta;

type ControlAndActionProps = Pick<Props, "language" | "onJump">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <AccountPage
    accountId={account1Id}
    onJump={props.onJump}
    language={props.language}
    accountResource={accountResource}
    projectResource={projectResource}
    typePartResource={typePartResource}
  />
);
Default.args = {
  language: d.Language.Japanese,
};
