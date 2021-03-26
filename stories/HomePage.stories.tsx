import * as React from "react";
import * as d from "../data";
import { HomePage, Props } from "../client/ui/HomePage";
import { Meta, Story } from "@storybook/react";
import { ArgType } from "@storybook/addons";
import { fullScreen } from "../.storybook/decorators";

const argTypes: Record<
  keyof Pick<Props, "projectDict" | "logInState" | "accountDict">,
  ArgType
> = {
  projectDict: {
    control: null,
  },
  logInState: { control: null },
  accountDict: { control: null },
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

type ControlAndActionProps = Pick<
  Props,
  "language" | "onJump" | "onLogInButtonClick"
>;

export const Default: Story<ControlAndActionProps> = (props) => (
  <HomePage
    language={props.language}
    accountDict={new Map()}
    logInState={{ _: "Guest" }}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "none" }}
  />
);
Default.args = {
  language: d.Language.Japanese,
};

const dummyAccountId = "dummyAccountId" as d.AccountId;

export const LoggedIn: Story<ControlAndActionProps> = (props) => (
  <HomePage
    language={props.language}
    accountDict={
      new Map([
        [
          dummyAccountId,
          {
            name: "サンプルアカウント",
            createTime: { day: 0, millisecond: 0 },
            imageHash: "" as d.ImageHash,
            introduction: "サンプルアカウントの自己紹介文",
          },
        ],
      ])
    }
    logInState={d.LogInState.LoggedIn({
      accountToken: "dummyAccountToken" as d.AccountToken,
      userId: dummyAccountId,
    })}
    onJump={props.onJump}
    onLogInButtonClick={props.onLogInButtonClick}
    projectDict={new Map()}
    topProjectsLoadingState={{ _: "none" }}
  />
);
LoggedIn.args = {
  language: d.Language.Japanese,
};
