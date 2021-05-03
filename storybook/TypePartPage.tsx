import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { Props, TypePartPage } from "../client/ui/TypePartPage";
import {
  accountResource,
  projectResource,
  typePart1Id,
  typePartIdListInProjectResource,
  typePartResource,
} from "./mockData";

const meta: Meta = {
  title: "TypePartPage",
  component: TypePartPage,
};
export default meta;

type ControlAndActionProps = Pick<Props, "language" | "onJump">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <TypePartPage
    typePartId={typePart1Id}
    typePartResource={typePartResource}
    language={props.language}
    projectResource={projectResource}
    accountResource={accountResource}
    onJump={props.onJump}
    typePartIdListInProjectResource={typePartIdListInProjectResource}
  />
);
Default.args = { language: d.Language.Japanese };
