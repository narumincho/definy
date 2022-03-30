import * as React from "react";
import { Meta, Story } from "@storybook/react";
import { ThemeColorRainbow } from "../client/tool/ThemeColorRainbow";

const meta: Meta = {
  title: "ThemeColorRainbow",
  component: ThemeColorRainbow,
};
export default meta;

export const Default: Story<never> = () => <ThemeColorRainbow />;
