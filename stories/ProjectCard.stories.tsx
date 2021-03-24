import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
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

const sampleProjectId = "sampleProjectId" as d.ProjectId;

export const Default: Story<never> = () => (
  <ProjectCard
    projectDict={
      new Map<d.ProjectId, d.Project>([
        [
          sampleProjectId,
          {
            name: "プロジェクト名",
            createAccountId: "createAccountId" as d.AccountId,
            createTime: { day: 0, millisecond: 0 },
            iconHash:
              "4fd10948344af0b16748efef0f2015700c87554be13036e13b99a56fc422ed02",
            imageHash:
              "3a08c6750c510132e89a7c16f31aabfc6370d443cdc9ed05ab3346dbf5456bdb",
            updateTime: { day: 0, millisecond: 0 },
          },
        ],
      ])
    }
    projectId={sampleProjectId}
    jumpHandler={() => {}}
    language="English"
  />
);
