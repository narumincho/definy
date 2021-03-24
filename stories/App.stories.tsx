import * as React from "react";
import { Meta, Story } from "@storybook/react";
import { App } from "../client/container/App";
import { fullScreen } from "../.storybook/decorators";

const meta: Meta = {
  title: "App",
  component: App,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

export const Default: Story<never> = () => <App />;
