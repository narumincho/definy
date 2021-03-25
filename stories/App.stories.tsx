import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { project1, project1Id, project2, project2Id } from "./mockData";
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
    onJump={() => {}}
    urlData={{ location: d.Location.Home, language: "English" }}
  />
);

export const Loading: Story<never> = () => (
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "loading" }}
    onJump={() => {}}
    urlData={{ location: d.Location.Home, language: "English" }}
  />
);

export const LoadedEmpty: Story<never> = () => (
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "loaded", projectIdList: [] }}
    onJump={() => {}}
    urlData={{ location: d.Location.Home, language: "English" }}
  />
);

export const Loaded: Story<never> = () => (
  <App
    projectDict={new Map<d.ProjectId, d.Project>([[project1Id, project1]])}
    topProjectsLoadingState={{ _: "loaded", projectIdList: [project1Id] }}
    onJump={() => {}}
    urlData={{ location: d.Location.Home, language: "English" }}
  />
);

export const Loaded2: Story<never> = () => (
  <App
    projectDict={
      new Map<d.ProjectId, d.Project>([
        [project1Id, project1],
        [project2Id, project2],
      ])
    }
    topProjectsLoadingState={{
      _: "loaded",
      projectIdList: [project1Id, project2Id],
    }}
    onJump={() => {}}
    urlData={{ location: d.Location.Home, language: "English" }}
  />
);
