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
      "header",
      { style: "background: #333;display: flex" },
      h(
        "h2",
        {
          style:
            "font-family:'Hack';font-size:32px;font-weight: normal;color: #b9d09b;margin:0;line-height:1;padding:8px",
        },
        "definy",
      ),
      h("div", { style: "flex-grow:1" }),
      h("div", {}, "ログイン状態: " + JSON.stringify(props.logInState)),
    ),
    h(
      "div",
      {},
      `ここはトップページ. 最近投稿されたアイデアなどを表示したい hl=${props.hl}`,
    ),
    h("div", {}, h(LogInStateView, { logInState: props.logInState })),
    h(
      "button",
      { onClick: props.onClickCreateIdea },
      "アイデアを投稿する (仮)",
    ),
  );
};
