import * as React from "react";
import * as d from "../data";
import { AboutPage, Props } from "../client/ui/AboutPage";
import { Meta, Story } from "@storybook/react";

const meta: Meta = {
  title: "AboutPage",
  component: AboutPage,
};
export default meta;

type ControlAndActionProps = Pick<Props, "language">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <AboutPage language={props.language} />
);
Default.args = {
  language: d.Language.Japanese,
};
