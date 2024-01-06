import { h } from "https://esm.sh/preact@10.19.3";
import { Language, Location } from "../location.ts";
import { LogInState } from "../component/LogInStateView.ts";
import { Header } from "../component/Header.ts";
import { Link } from "../component/Link.ts";

export const Top = (props: {
  readonly hl: Language;
  readonly logInState: LogInState;
  readonly onClickCreateIdea: () => void;
  readonly onLocationMove: (location: Location) => void;
}) => {
  return h(
    "div",
    {},
    h(Header, {
      logInState: props.logInState,
      hl: props.hl,
      onLocationMove: props.onLocationMove,
    }),
    h(
      "div",
      {},
      `ここはトップページ. 最近投稿されたアイデアなどを表示したい hl=${props.hl}`,
    ),
    h(Link, {
      location: { type: "about", hl: props.hl },
      onLocationMove: props.onLocationMove,
      children: "about",
    }),
    h(
      "button",
      { onClick: props.onClickCreateIdea },
      "アイデアを投稿する (仮)",
    ),
  );
};
