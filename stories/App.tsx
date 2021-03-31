import * as React from "react";
import * as d from "../data";
import { App, Props } from "../client/ui/App";
import { Meta, Story } from "@storybook/react";
import {
  project1,
  project1Id,
  project2,
  project2Id,
  useProjectDictResult,
} from "./mockData";
import { ArgType } from "@storybook/addons";
import { fullScreen } from "../.storybook/decorators";

type ControlAndActionProps = Pick<
  Props,
  | "onJump"
  | "onLogInButtonClick"
  | "language"
  | "onCreateProject"
  | "onRequestProjectById"
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
    useProjectDictResult={useProjectDictResult}
    topProjectsLoadingState={{ _: "none" }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
  />
);

export const Loading: Story<ControlAndActionProps> = (props) => (
  <App
    useProjectDictResult={useProjectDictResult}
    topProjectsLoadingState={{ _: "loading" }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
  />
);

export const LoadedEmpty: Story<ControlAndActionProps> = (props) => (
  <App
    useProjectDictResult={useProjectDictResult}
    topProjectsLoadingState={{ _: "loaded", projectIdList: [] }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
  />
);

export const Loaded: Story<ControlAndActionProps> = (props) => (
  <App
    useProjectDictResult={useProjectDictResult}
    topProjectsLoadingState={{ _: "loaded", projectIdList: [project1Id] }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
  />
);

export const Loaded2: Story<ControlAndActionProps> = (props) => (
  <App
    useProjectDictResult={useProjectDictResult}
    topProjectsLoadingState={{
      _: "loaded",
      projectIdList: [project1Id, project2Id],
    }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
  />
);

export const RequestingLogInUrl: Story<ControlAndActionProps> = (props) => (
  <App
    useProjectDictResult={useProjectDictResult}
    topProjectsLoadingState={{ _: "none" }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={d.LogInState.RequestingLogInUrl("Google")}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
  />
);

export const JumpingToLogInPage: Story<ControlAndActionProps> = (props) => (
  <App
    useProjectDictResult={useProjectDictResult}
    topProjectsLoadingState={{ _: "none" }}
    location={d.Location.Home}
    language={props.language}
    accountDict={new Map()}
    logInState={d.LogInState.JumpingToLogInPage}
    createProjectState={{ _: "none" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    onLogOutButtonClick={props.onLogInButtonClick}
    onCreateProject={props.onCreateProject}
    onRequestProjectById={props.onRequestProjectById}
  />
);
