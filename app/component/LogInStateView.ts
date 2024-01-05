import { h } from "https://esm.sh/preact@10.19.3";

export type LogInState = {
  readonly type: "guest";
} | {
  readonly type: "loading";
} | {
  readonly type: "account";
  readonly id: string;
  readonly name: string;
};

export const LogInStateView = (props: {
  readonly logInState: LogInState;
}) => {
  return h("div", {}, `ログイン状態は ${JSON.stringify(props.logInState)}`);
};
