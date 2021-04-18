import * as React from "react";
import * as d from "../data";
import { Meta, Story } from "@storybook/react";
import { typePart1Id, typePartResource } from "./mockData";
import { TypePartPage } from "../client/ui/TypePartPage";
import { fullScreen } from "../.storybook/decorators";

const meta: Meta = {
  title: "TypePartPage",
  component: TypePartPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [fullScreen],
};
export default meta;

export const Default: Story<never> = () => (
  <TypePartPage typePartId={typePart1Id} typePartResource={typePartResource} />
);
