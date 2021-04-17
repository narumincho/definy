import * as React from "react";
import * as d from "../data";
import { HomePage, Props } from "../client/ui/HomePage";
import { Meta, Story } from "@storybook/react";
import {
  accountResource,
  project1Id,
  project2Id,
  projectResource,
} from "./mockData";
import { ArgType } from "@storybook/addons";
import { action } from "@storybook/addon-actions";
import { fullScreen } from "../.storybook/decorators";

const argTypes: Record<keyof Pick<Props, "logInState">, ArgType> = {
  logInState: { control: null },
};

const meta: Meta = {
  title: "HomePage",
  component: HomePage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
  argTypes,
};
export default meta;

type ControlAndActionProps = Pick<Props, "language" | "onJump">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <HomePage
    language={props.language}
    projectResource={projectResource}
    accountResource={accountResource}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    topProjectsLoadingState={{ _: "none" }}
    requestTop50Project={action("requestTop50Project")}
  />
);
Default.args = {
  language: d.Language.Japanese,
};

const dummyAccountId = "dummyAccountId" as d.AccountId;

export const LoggedIn: Story<ControlAndActionProps> = (props) => (
  <HomePage
    language={props.language}
    projectResource={projectResource}
    accountResource={accountResource}
    logInState={d.LogInState.LoggedIn({
      accountToken: "dummyAccountToken" as d.AccountToken,
      userId: dummyAccountId,
    })}
    onJump={props.onJump}
    topProjectsLoadingState={{ _: "none" }}
    requestTop50Project={action("requestTop50Project")}
  />
);
LoggedIn.args = {
  language: d.Language.Japanese,
};

export const Loaded: Story<ControlAndActionProps> = (props) => (
  <HomePage
    language={props.language}
    projectResource={projectResource}
    accountResource={accountResource}
    logInState={d.LogInState.LoggedIn({
      accountToken: "dummyAccountToken" as d.AccountToken,
      userId: dummyAccountId,
    })}
    onJump={props.onJump}
    topProjectsLoadingState={{
      _: "loaded",
      projectIdList: [project1Id, project2Id],
    }}
    requestTop50Project={action("requestTop50Project")}
  />
);
Loaded.args = {
  language: d.Language.Japanese,
};
