import * as d from "definy-core/source/data";
import { Editor, div } from "./ui";
import { css } from "@emotion/react";

export const ProjectIdEditor: Editor<d.ProjectId> = (props) => {
  return div(css(), props.value);
};
