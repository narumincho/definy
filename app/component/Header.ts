import { h } from "https://esm.sh/preact@10.19.3";
import { LogInState, LogInStateView } from "../component/LogInStateView.ts";

export const Header = (props: {
  readonly logInState: LogInState;
}) => {
  return h(
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
    h(LogInStateView, { logInState: props.logInState }),
  );
};
