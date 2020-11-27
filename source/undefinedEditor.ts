import { Editor } from "./ui";
import { createElement as h } from "react";

export const UndefinedEditor: Editor<undefined> = () => {
  return h("div", {});
};
