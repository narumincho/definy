import { Editor } from "./ui";
import { jsx } from "@emotion/react";

export const UndefinedEditor: Editor<undefined> = () => {
  return jsx("div", {}, []);
};
