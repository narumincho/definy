import * as React from "react";
import * as d from "../localData";
import { CreateProjectPage, Props } from "../client/ui/CreateProjectPage";
import { Meta, Story } from "@storybook/react";

const meta: Meta = {
  title: "CreateProjectPage",
  component: CreateProjectPage,
};
export default meta;

type ControlAndActionProps = Pick<Props, "onCreateProject">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <CreateProjectPage
    onCreateProject={props.onCreateProject}
    createProjectState={{ _: "none" }}
  />
);
