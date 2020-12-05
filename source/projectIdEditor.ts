import * as d from "definy-core/source/data";
import { Editor } from "./ui";
import { jsx } from "@emotion/react";

export const ProjectIdEditor: Editor<d.ProjectId> = (props) => {
  return jsx("div", {}, props.value);
};
