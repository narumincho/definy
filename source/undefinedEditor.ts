import { Editor } from "./ui";
import { jsx as h } from "@emotion/react";

export const UndefinedEditor: Editor<undefined> = () => {
  return h("div", {});
};
