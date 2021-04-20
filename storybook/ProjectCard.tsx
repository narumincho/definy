import * as React from "react";
import { Meta, Story } from "@storybook/react";
import { ProjectCard, Props } from "../client/ui/ProjectCard";
import { project1Id, projectResource } from "./mockData";
import { fullScreen } from "./decorators";

const meta: Meta = {
  title: "ProjectCard",
  component: ProjectCard,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};

export default meta;

type ControlAndActionProps = Pick<Props, "language" | "onJump">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <ProjectCard
    projectResource={projectResource}
    projectId={project1Id}
    language={props.language}
    onJump={props.onJump}
  />
);
