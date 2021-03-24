import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { project1, project1Id } from "./mockData";
import { ProjectCard } from "../client/ui/ProjectCard";
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

export const Default: Story<never> = () => (
  <ProjectCard
    projectDict={new Map<d.ProjectId, d.Project>([[project1Id, project1]])}
    projectId={project1Id}
    jumpHandler={() => {}}
    language="English"
  />
);
