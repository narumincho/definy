import * as React from "react";
import { ArgTypes, Meta, Story } from "@storybook/react";
import { Button, Props } from "../client/ui/Button";

const argTypes: Record<"text", ArgTypes[string]> = {
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
