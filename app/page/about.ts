import { h } from "https://esm.sh/preact@10.19.3";
import { Language } from "../location.ts";
import { Header } from "../component/Header.ts";
import { LogInState } from "../component/LogInStateView.ts";

export const About = (props: {
  readonly hl: Language;
  readonly logInState: LogInState;
}) => {
  return h(
    "div",
    {},
    h(Header, { logInState: props.logInState }),
    `ここはバージョンやGitHubのリンク, ライセンスなどを表示したい hl=${props.hl}`,
  );
};
