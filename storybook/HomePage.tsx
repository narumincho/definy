import * as React from "react";
import * as d from "../localData";
import { HomePage, Props } from "../client/ui/HomePage";
import { Meta, Story } from "@storybook/react";
import {
  accountResource,
  project1Id,
  project2Id,
  projectResource,
  typePartResource,
} from "./mockData";
import { ArgType } from "@storybook/addons";
import { action } from "@storybook/addon-actions";

const argTypes: Record<keyof Pick<Props, "logInState">, ArgType> = {
  logInState: { control: null },
};

const meta: Meta = {
  title: "HomePage",
  component: HomePage,
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
    typePartResource={typePartResource}
  />
);
Default.args = {
  language: d.Language.Japanese,
};

const dummyAccountId = d.AccountId.fromString("dummyAccountId");

export const LoggedIn: Story<ControlAndActionProps> = (props) => (
  <HomePage
    language={props.language}
    projectResource={projectResource}
    accountResource={accountResource}
    logInState={d.LogInState.LoggedIn({
      accountToken: d.AccountToken.fromString("dummyAccountToken"),
      userId: dummyAccountId,
    })}
    onJump={props.onJump}
    topProjectsLoadingState={{ _: "none" }}
    requestTop50Project={action("requestTop50Project")}
    typePartResource={typePartResource}
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
      accountToken: d.AccountToken.fromString("dummyAccountToken"),
      userId: dummyAccountId,
    })}
    onJump={props.onJump}
    topProjectsLoadingState={{
      _: "loaded",
      projectIdList: [project1Id, project2Id],
    }}
    requestTop50Project={action("requestTop50Project")}
    typePartResource={typePartResource}
  />
);
Loaded.args = {
  language: d.Language.Japanese,
};
