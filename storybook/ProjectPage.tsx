import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { ProjectPage, Props } from "../client/ui/ProjectPage";
import {
  accountResource,
  project1Id,
  projectResource,
  typePartIdListInProjectResource,
  typePartResource,
} from "./mockData";
import { action } from "@storybook/addon-actions";

const meta: Meta = {
  title: "ProjectPage",
  component: ProjectPage,
};
export default meta;

type ControlAndActionProps = Pick<Props, "language" | "onJump">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <ProjectPage
    language={props.language}
    projectResource={projectResource}
    accountResource={accountResource}
    typePartResource={typePartResource}
    typePartIdListInProjectResource={typePartIdListInProjectResource}
    projectId={project1Id}
    onJump={props.onJump}
    addTypePart={action("addTypePart")}
    generateCode={action("generateCode")}
    outputCode={{ tag: "notGenerated" }}
  />
);
Default.args = {
  language: d.Language.Japanese,
};
