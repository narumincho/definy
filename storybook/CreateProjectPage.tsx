import * as React from "react";
import * as d from "../data";
import { CreateProjectPage, Props } from "../client/ui/CreateProjectPage";
import { Meta, Story } from "@storybook/react";
import { fullScreen } from "./decorators";

const meta: Meta = {
  title: "CreateProjectPage",
  component: CreateProjectPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

type ControlAndActionProps = Pick<Props, "onCreateProject">;

export const Default: Story<ControlAndActionProps> = (props) => (
  <CreateProjectPage
    onCreateProject={props.onCreateProject}
    createProjectState={{ _: "none" }}
  />
);
