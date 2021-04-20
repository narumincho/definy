import * as React from "react";
import { Button, Props } from "../client/ui/Button";
import { Meta, Story } from "@storybook/react";
import { ArgType } from "@storybook/addons";

const argTypes: Record<"text", ArgType> = {
  text: {
    control: {
      type: "text",
    },
    description: "storybook用. ボタンの中身に表示するテキスト",
  },
};

const meta: Meta = {
  title: "Button",
  component: Button,
  argTypes,
};
export default meta;

type ControlAndActionProps = Pick<Props, "onClick"> & { text: string };

export const Default: Story<ControlAndActionProps> = (props) => (
  <Button onClick={props.onClick}>{props.text}</Button>
);
Default.args = {
  text: "ボタン",
};
