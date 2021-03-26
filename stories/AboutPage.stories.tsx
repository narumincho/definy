import * as React from "react";
import * as d from "../data";
import { AboutPage, Props } from "../client/ui/AboutPage";
import { Meta, Story } from "@storybook/react";
import { fullScreen } from "../.storybook/decorators";

const meta: Meta = {
  title: "AboutPage",
  component: AboutPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

type ControlAndActionProps = Pick<
  Props,
  "language" | "onJump" | "onLogInButtonClick"
>;

export const Default: Story<ControlAndActionProps> = (props) => (
  <AboutPage
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
  />
);
Default.args = {
  language: d.Language.Japanese,
};
