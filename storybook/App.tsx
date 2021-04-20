import * as React from "react";
import * as d from "../data";
import { App, Props } from "../client/ui/App";
import { Meta, Story } from "@storybook/react";
import {
  accountResource,
  project1Id,
  project2Id,
  projectResource,
  typePartIdListInProjectResource,
  typePartResource,
} from "./mockData";
import { ArgType } from "@storybook/addons";
import type { UseDefinyAppResult } from "../client/hook/useDefinyApp";
import { action } from "@storybook/addon-actions";
import { fullScreen } from "./decorators";

const useDefinyAppResult: UseDefinyAppResult = {
  accountResource,
  projectResource,
  typePartIdListInProjectResource,
  typePartResource,
  createProject: action("createProject"),
  createProjectState: { _: "none" },
  jump: action("jump"),
  language: d.Language.Japanese,
  location: d.Location.Home,
  logIn: action("logIn"),
  logInState: d.LogInState.Guest,
  logOut: action("logOut"),
  topProjectsLoadingState: { _: "none" },
  addTypePart: action("addTypePart"),
  requestTop50Project: action("requestTop50Project"),
};

type ControlAndActionProps = Pick<UseDefinyAppResult, "language">;

const argTypes: Record<keyof Props & "language", ArgType> = {
  useDefinyAppResult: {
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
    useDefinyAppResult={{ ...useDefinyAppResult, language: props.language }}
  />
);

export const Loading: Story<ControlAndActionProps> = (props) => (
  <App
    useDefinyAppResult={{
      ...useDefinyAppResult,
      topProjectsLoadingState: { _: "loading" },
      language: props.language,
    }}
  />
);

export const LoadedEmpty: Story<ControlAndActionProps> = (props) => (
  <App
    useDefinyAppResult={{
      ...useDefinyAppResult,
      topProjectsLoadingState: { _: "loaded", projectIdList: [] },
      language: props.language,
    }}
  />
);

export const Loaded: Story<ControlAndActionProps> = (props) => (
  <App
    useDefinyAppResult={{
      ...useDefinyAppResult,
      topProjectsLoadingState: { _: "loaded", projectIdList: [project1Id] },
      language: props.language,
    }}
  />
);

export const Loaded2: Story<ControlAndActionProps> = (props) => (
  <App
    useDefinyAppResult={{
      ...useDefinyAppResult,
      topProjectsLoadingState: {
        _: "loaded",
        projectIdList: [project1Id, project2Id],
      },
      language: props.language,
    }}
  />
);

export const RequestingLogInUrl: Story<ControlAndActionProps> = (props) => (
  <App
    useDefinyAppResult={{
      ...useDefinyAppResult,
      logInState: d.LogInState.RequestingLogInUrl("Google"),
      language: props.language,
    }}
  />
);

export const JumpingToLogInPage: Story<ControlAndActionProps> = (props) => (
  <App
    useDefinyAppResult={{
      ...useDefinyAppResult,
      logInState: d.LogInState.JumpingToLogInPage,
      language: props.language,
    }}
  />
);
