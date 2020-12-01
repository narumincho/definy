import { Editor, div } from "./ui";
import { css } from "@emotion/react";

export const UndefinedEditor: Editor<undefined> = () => {
  return div(css(), []);
};
