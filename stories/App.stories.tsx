import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { App } from "../client/ui/App";
import { fullScreen } from "../.storybook/decorators";

const meta: Meta = {
  title: "App",
  component: App,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

export const None: Story<never> = () => (
  <App projectDict={new Map()} topProjectsLoadingState={{ _: "none" }} />
);

export const Loading: Story<never> = () => (
  <App projectDict={new Map()} topProjectsLoadingState={{ _: "loading" }} />
);

export const LoadedEmpty: Story<never> = () => (
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "loaded", projectIdList: [] }}
  />
);

const sampleProjectId = "sampleProjectId" as d.ProjectId;

export const Loaded: Story<never> = () => (
  <App
    projectDict={
      new Map<d.ProjectId, d.Project>([
        [
          sampleProjectId,
          {
            name: "プロジェクト名",
            createAccountId: "createAccountId" as d.AccountId,
            createTime: { day: 0, millisecond: 0 },
            iconHash: "sampleIconHash",
            imageHash: "sampleImageHash" as d.ImageHash,
            updateTime: { day: 0, millisecond: 0 },
          },
        ],
      ])
    }
    topProjectsLoadingState={{ _: "loaded", projectIdList: [sampleProjectId] }}
  />
);
