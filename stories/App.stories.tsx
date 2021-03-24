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
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "none" }}
    jumpHandler={() => {}}
    urlData={{ location: d.Location.Home, language: "English" }}
  />
);

export const Loading: Story<never> = () => (
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "loading" }}
    jumpHandler={() => {}}
    urlData={{ location: d.Location.Home, language: "English" }}
  />
);

export const LoadedEmpty: Story<never> = () => (
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "loaded", projectIdList: [] }}
    jumpHandler={() => {}}
    urlData={{ location: d.Location.Home, language: "English" }}
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
              "4fd10948344af0b16748efef0f2015700c87554be13036e13b99a56fc422ed02",
            imageHash:
              "3a08c6750c510132e89a7c16f31aabfc6370d443cdc9ed05ab3346dbf5456bdb",
            updateTime: { day: 0, millisecond: 0 },
          },
        ],
      ])
    }
    topProjectsLoadingState={{ _: "loaded", projectIdList: [sampleProjectId] }}
    jumpHandler={() => {}}
    urlData={{ location: d.Location.Home, language: "English" }}
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
              "4fd10948344af0b16748efef0f2015700c87554be13036e13b99a56fc422ed02",
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
              "366ec0307e312489e88e6c7d347ce344a6fb326c5f2ddd286153c3b6628ffb73",
            imageHash:
              "3204f96f9e58c0d720c39599747e7568872a396b3442e1cfe7607d041901277c",
            updateTime: { day: 0, millisecond: 0 },
          },
        ],
      ])
    }
    topProjectsLoadingState={{
      _: "loaded",
      projectIdList: [sampleProjectId, sampleProjectId2],
    }}
    jumpHandler={() => {}}
    urlData={{ location: d.Location.Home, language: "English" }}
  />
);
