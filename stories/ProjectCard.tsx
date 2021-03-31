import * as React from "react";
import { Meta, Story } from "@storybook/react";
import { ProjectCard, Props } from "../client/ui/ProjectCard";
import { project1Id, useProjectDictResult } from "./mockData";
import { fullScreen } from "../.storybook/decorators";

const meta: Meta = {
  title: "ProjectCard",
  component: ProjectCard,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

type ControlAndActionProps = Pick<
  Props,
  "language" | "onJump" | "onRequestProjectById"
>;

export const Default: Story<ControlAndActionProps> = (props) => (
  <ProjectCard
    useProjectDictResult={useProjectDictResult}
    projectId={project1Id}
    language={props.language}
    onJump={props.onJump}
    onRequestProjectById={props.onRequestProjectById}
  />
);
