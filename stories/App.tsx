import * as React from "react";
import * as d from "../data";
import { App, Props } from "../client/ui/App";
import { Meta, Story } from "@storybook/react";
import { getAccount, getProject, project1Id, project2Id } from "./mockData";
import { ArgType } from "@storybook/addons";
import { fullScreen } from "../.storybook/decorators";

type ControlAndActionProps = Pick<
  Props,
  | "onJump"
  | "onLogInButtonClick"
  | "language"
  | "onCreateProject"
  | "onRequestProjectById"
  | "onRequestAccount"
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
    topProjectsLoadingState={{ _: "none" }}
    location={d.Location.Home}
    language={props.language}
    logInState={{ _: "Guest" }}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
    onRequestAccount={props.onRequestAccount}
    getAccount={getAccount}
    getProject={getProject}
  />
);

export const Loading: Story<ControlAndActionProps> = (props) => (
  <App
    topProjectsLoadingState={{ _: "loading" }}
    location={d.Location.Home}
    language={props.language}
    logInState={{ _: "Guest" }}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
    onRequestAccount={props.onRequestAccount}
    getAccount={getAccount}
    getProject={getProject}
  />
);

export const LoadedEmpty: Story<ControlAndActionProps> = (props) => (
  <App
    topProjectsLoadingState={{ _: "loaded", projectIdList: [] }}
    location={d.Location.Home}
    language={props.language}
    logInState={{ _: "Guest" }}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
    onRequestAccount={props.onRequestAccount}
    getAccount={getAccount}
    getProject={getProject}
  />
);

export const Loaded: Story<ControlAndActionProps> = (props) => (
  <App
    topProjectsLoadingState={{ _: "loaded", projectIdList: [project1Id] }}
    location={d.Location.Home}
    language={props.language}
    logInState={{ _: "Guest" }}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
    onRequestAccount={props.onRequestAccount}
    getAccount={getAccount}
    getProject={getProject}
  />
);

export const Loaded2: Story<ControlAndActionProps> = (props) => (
  <App
    topProjectsLoadingState={{
      _: "loaded",
      projectIdList: [project1Id, project2Id],
    }}
    location={d.Location.Home}
    language={props.language}
    logInState={{ _: "Guest" }}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
    onRequestAccount={props.onRequestAccount}
    getAccount={getAccount}
    getProject={getProject}
  />
);

export const RequestingLogInUrl: Story<ControlAndActionProps> = (props) => (
  <App
    topProjectsLoadingState={{ _: "none" }}
    location={d.Location.Home}
    language={props.language}
    logInState={d.LogInState.RequestingLogInUrl("Google")}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
    onRequestAccount={props.onRequestAccount}
    getAccount={getAccount}
    getProject={getProject}
  />
);

export const JumpingToLogInPage: Story<ControlAndActionProps> = (props) => (
  <App
    topProjectsLoadingState={{ _: "none" }}
    location={d.Location.Home}
    language={props.language}
    logInState={d.LogInState.JumpingToLogInPage}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
    onRequestAccount={props.onRequestAccount}
    getAccount={getAccount}
    getProject={getProject}
  />
);
