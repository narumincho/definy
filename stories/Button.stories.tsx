import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { Button } from "../client/ui/Button";

const meta: Meta = {
  title: "Button",
  component: Button,
};
export default meta;

export const Default: Story<never> = (props) => <Button />;
