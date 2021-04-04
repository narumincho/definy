import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { ProjectPage, Props } from "../client/ui/ProjectPage";
import { getAccount, getProject, project1Id } from "./mockData";
import { fullScreen } from "../.storybook/decorators";

const meta: Meta = {
  title: "ProjectPage",
  component: ProjectPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

type ControlAndActionProps = Pick<
  Props,
  "language" | "onJump" | "onRequestProjectById" | "onRequestAccount"
>;

export const Default: Story<ControlAndActionProps> = (props) => (
  <ProjectPage
    language={props.language}
    getProject={getProject}
    getAccount={getAccount}
    projectId={project1Id}
    onJump={props.onJump}
    onRequestProjectById={props.onRequestProjectById}
    onRequestAccount={props.onRequestAccount}
  />
);
Default.args = {
  language: d.Language.Japanese,
};
