import * as d from "definy-core/source/data";
import { Editor } from "./ui";
import { createElement as h } from "react";

export const TypePartIdEditor: Editor<d.TypePartId> = (props) => {
  return h("div", {}, props.value);
};
