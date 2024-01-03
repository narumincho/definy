import { h } from "https://esm.sh/preact@10.19.3";
import { Location } from "./location.ts";
import { Top } from "./page/top.ts";
import { About } from "./page/about.ts";
import { ExprPage } from "./page/expr.ts";
import { IdPage } from "./page/id.ts";

export const App = (props: { readonly location: Location }) => {
  switch (props.location.type) {
    case "top":
      return h(Top, { hl: props.location.hl });
    case "about":
      return h(About, { hl: props.location.hl });
    case "expr":
      return h(ExprPage, { hl: props.location.hl, expr: props.location.expr });
    case "id":
      return h(IdPage, { hl: props.location.hl, id: props.location.id });
    case "file":
    case "graphql":
      return h("div", {}, "これは表示されないはず....");
  }
};
