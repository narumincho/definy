import * as React from "react";
import { AccountCard, Props } from "../client/ui/AccountCard";
import { Meta, Story } from "@storybook/react";
import { account1Id, getAccount } from "./mockData";
import { fullScreen } from "../.storybook/decorators";

const meta: Meta = {
  title: "AccountCard",
  component: AccountCard,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

type ControlAndActionProps = Pick<
  Props,
  "language" | "onJump" | "onRequestAccount"
>;

export const Default: Story<ControlAndActionProps> = (props) => (
  <AccountCard
    language={props.language}
    onJump={props.onJump}
    accountId={account1Id}
    getAccount={getAccount}
    onRequestAccount={props.onRequestAccount}
  />
);
