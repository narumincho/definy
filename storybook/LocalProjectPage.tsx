import * as React from "react";
import { Meta, Story } from "@storybook/react";
import { LocalProjectPage } from "../client/ui/LocalProjectPage";

const meta: Meta = {
  title: "LocalProjectPage",
  component: LocalProjectPage,
};
export default meta;

export const Default: Story<never> = () => <LocalProjectPage />;
