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
            iconHash:
              "3a08c6750c510132e89a7c16f31aabfc6370d443cdc9ed05ab3346dbf5456bdb",
            imageHash:
              "3a08c6750c510132e89a7c16f31aabfc6370d443cdc9ed05ab3346dbf5456bdb",
            updateTime: { day: 0, millisecond: 0 },
          },
        ],
      ])
    }
    topProjectsLoadingState={{ _: "loaded", projectIdList: [sampleProjectId] }}
  />
);

const sampleProjectId2 = "sampleProjectId2" as d.ProjectId;

export const Loaded2: Story<never> = () => (
  <App
    projectDict={
      new Map<d.ProjectId, d.Project>([
        [
          sampleProjectId,
          {
            name: "プロジェクト名",
            createAccountId: "createAccountId" as d.AccountId,
            createTime: { day: 0, millisecond: 0 },
            iconHash:
              "3a08c6750c510132e89a7c16f31aabfc6370d443cdc9ed05ab3346dbf5456bdb",
            imageHash:
              "3a08c6750c510132e89a7c16f31aabfc6370d443cdc9ed05ab3346dbf5456bdb",
            updateTime: { day: 0, millisecond: 0 },
          },
        ],
        [
          sampleProjectId2,
          {
            name: "プロジェクト2",
            createAccountId: "createAccountId" as d.AccountId,
            createTime: { day: 0, millisecond: 0 },
            iconHash:
              "3a08c6750c510132e89a7c16f31aabfc6370d443cdc9ed05ab3346dbf5456bdb",
            imageHash:
              "3a08c6750c510132e89a7c16f31aabfc6370d443cdc9ed05ab3346dbf5456bdb",
            updateTime: { day: 0, millisecond: 0 },
          },
        ],
      ])
    }
    topProjectsLoadingState={{
      _: "loaded",
      projectIdList: [sampleProjectId, sampleProjectId2],
    }}
  />
);
