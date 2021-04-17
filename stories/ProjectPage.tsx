import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { ProjectPage, Props } from "../client/ui/ProjectPage";
import { accountResource, project1Id, projectResource } from "./mockData";
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

type ControlAndActionProps = Pick<Props, "language" | "onJump">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <ProjectPage
    language={props.language}
    projectResource={projectResource}
    accountResource={accountResource}
    projectId={project1Id}
    onJump={props.onJump}
  />
);
Default.args = {
  language: d.Language.Japanese,
};
