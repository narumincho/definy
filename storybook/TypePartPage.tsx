import * as React from "react";
import * as d from "../localData";
import { Meta, Story } from "@storybook/react";
import { Props, TypePartPage } from "../client/ui/TypePartPage";
import {
  accountResource,
  listTypePartId,
  projectResource,
  typePart1Id,
  typePartIdListInProjectResource,
  typePartResource,
} from "./mockData";
import { action } from "@storybook/addon-actions";

const meta: Meta = {
  title: "TypePartPage",
  component: TypePartPage,
};
export default meta;

type ControlAndActionProps = Pick<Props, "language">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <TypePartPage
    typePartId={typePart1Id}
    typePartResource={typePartResource}
    language={props.language}
    projectResource={projectResource}
    accountResource={accountResource}
    typePartIdListInProjectResource={typePartIdListInProjectResource}
    isSavingTypePart={false}
    saveTypePart={action("saveTypePart")}
  />
);
Default.args = { language: d.Language.Japanese };

export const WithTypeParameter: Story<ControlAndActionProps> = (props) => (
  <TypePartPage
    typePartId={listTypePartId}
    typePartResource={typePartResource}
    language={props.language}
    projectResource={projectResource}
    accountResource={accountResource}
    typePartIdListInProjectResource={typePartIdListInProjectResource}
    isSavingTypePart={false}
    saveTypePart={action("saveTypePart")}
  />
);
Default.args = { language: d.Language.Japanese };
