import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { Header } from "../client/ui/Header";
import { fullScreen } from "../.storybook/decorators";

const meta: Meta = {
  title: "Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

export const Default: Story<{ language: d.Language; onJump: () => void }> = (
  props
) => <Header onJump={props.onJump} language={props.language} />;
Default.args = {
  language: d.Language.Japanese,
};
