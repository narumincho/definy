import { h } from "https://esm.sh/preact@10.19.3";
import { Language } from "../location.ts";
import { LogInState, LogInStateView } from "../component/LogInStateView.ts";

export const Top = (props: {
  readonly hl: Language;
  readonly logInState: LogInState;
  readonly onClickCreateIdea: () => void;
}) => {
  return h(
    "div",
    {},
    h(
      "div",
      {},
      `ここはトップページ. 最近投稿されたアイデアなどを表示したい hl=${props.hl}`,
    ),
    h("div", {}, h(LogInStateView, { logInState: props.logInState })),
    h("button", { onClick: props.onClickCreateIdea }, "アイデアを投稿する"),
  );
};
