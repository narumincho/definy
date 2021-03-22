import * as React from "react";
import { Meta, Story } from "@storybook/react";
import { DefinyApp } from "../client/App";

const meta: Meta = {
  title: "DefinyApp",
  component: DefinyApp,
};
export default meta;

export const Default: Story<never> = () => <DefinyApp />;
