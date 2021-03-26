import * as React from "react";
import * as d from "../data";
import { App, Props } from "../client/ui/App";
import { Meta, Story } from "@storybook/react";
import { project1, project1Id, project2, project2Id } from "./mockData";
import { ArgType } from "@storybook/addons";
import { fullScreen } from "../.storybook/decorators";

type ControlAndActionProps = Pick<
  Props,
  "onJump" | "onLogInButtonClick" | "language" | "onCreateProject"
>;

const argTypes: Record<
  keyof Pick<Props, "topProjectsLoadingState" | "language">,
  ArgType
> = {
  topProjectsLoadingState: {
    control: null,
  },
  language: {
    defaultValue: d.Language.Japanese,
  },
};

const meta: Meta = {
  title: "App",
  component: App,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
  argTypes,
};
export default meta;

export const None: Story<ControlAndActionProps> = (props) => (
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "none" }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
  />
);

export const Loading: Story<ControlAndActionProps> = (props) => (
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "loading" }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
  />
);

export const LoadedEmpty: Story<ControlAndActionProps> = (props) => (
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "loaded", projectIdList: [] }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
  />
);

export const Loaded: Story<ControlAndActionProps> = (props) => (
  <App
    projectDict={new Map<d.ProjectId, d.Project>([[project1Id, project1]])}
    topProjectsLoadingState={{ _: "loaded", projectIdList: [project1Id] }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
  />
);

export const Loaded2: Story<ControlAndActionProps> = (props) => (
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
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
  />
);

export const RequestingLogInUrl: Story<ControlAndActionProps> = (props) => (
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "none" }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={d.LogInState.RequestingLogInUrl("Google")}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
  />
);

export const JumpingToLogInPage: Story<ControlAndActionProps> = (props) => (
  <App
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "none" }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={d.LogInState.JumpingToLogInPage}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
  />
);
