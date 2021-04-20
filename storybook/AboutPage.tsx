import * as React from "react";
import * as d from "../data";
import { AboutPage, Props } from "../client/ui/AboutPage";
import { Meta, Story } from "@storybook/react";
import { fullScreen } from "./decorators";

const meta: Meta = {
  title: "AboutPage",
  component: AboutPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

type ControlAndActionProps = Pick<Props, "language">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <AboutPage language={props.language} />
);
Default.args = {
  language: d.Language.Japanese,
};
