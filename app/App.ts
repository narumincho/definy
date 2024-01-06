import { h } from "https://esm.sh/preact@10.19.3";
import { Location } from "./location.ts";
import { Top } from "./page/top.ts";
import { About } from "./page/about.ts";
import { ExprPage } from "./page/expr.ts";
import { IdPage } from "./page/id.ts";
import { LogInState } from "./component/LogInStateView.ts";

export type Props = {
  readonly location: Location;
  readonly onClickCreateIdea: () => void;
  readonly logInState: LogInState;
  readonly onLocationMove: (location: Location) => void;
  readonly languageDropdownIsOpen: boolean;
  readonly onSetLanguageDropdownIsOpen: (isOpen: boolean) => void;
};

export const App = (
  props: Props,
) => {
  switch (props.location.type) {
    case "top":
      return h(Top, {
        hl: props.location.hl,
        logInState: props.logInState,
        onClickCreateIdea: props.onClickCreateIdea,
        onLocationMove: props.onLocationMove,
      });
    case "about":
      return h(About, {
        hl: props.location.hl,
        logInState: props.logInState,
        onLocationMove: props.onLocationMove,
        languageDropdownIsOpen: props.languageDropdownIsOpen,
        onSetLanguageDropdownIsOpen: props.onSetLanguageDropdownIsOpen,
      });
    case "expr":
      return h(ExprPage, { hl: props.location.hl, expr: props.location.expr });
    case "id":
      return h(IdPage, { hl: props.location.hl, id: props.location.id });
    case "file":
    case "graphql":
      return h("div", {}, "これは表示されないはず....");
  }
};
