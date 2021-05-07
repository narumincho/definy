import * as React from "react";
import * as d from "../data";
import { AccountCard, Props } from "../client/ui/AccountCard";
import { Meta, Story } from "@storybook/react";
import { account1Id, accountResource } from "./mockData";

const meta: Meta = {
  title: "AccountCard",
  component: AccountCard,
};
export default meta;

type ControlAndActionProps = Pick<Props, "language" | "onJump">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <AccountCard
    language={props.language}
    onJump={props.onJump}
    accountId={account1Id}
    accountResource={accountResource}
  />
);
Default.args = {
  language: d.Language.Japanese,
};
