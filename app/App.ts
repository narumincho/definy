import { h } from "https://esm.sh/preact@10.19.3";
import { Location } from "./location.ts";
import { Top } from "./page/top.ts";
import { About } from "./page/about.ts";

export const App = (props: { readonly location: Location }) => {
  switch (props.location.type) {
    case "top":
      return h(Top, { hl: props.location.hl });
    case "about":
      return h(About, { hl: props.location.hl });
    case "file":
      return h("div", {}, "これは表示されないはず....");
  }
};
