import * as React from "react";
import { Meta, Story } from "@storybook/react";
import { TimeCard } from "../client/ui/TimeCard";

const meta: Meta = {
  title: "TimeCard",
  component: TimeCard,
};
export default meta;

export const Default: Story<{ day: number; millisecond: number }> = (props) => (
  <TimeCard time={{ day: props.day, millisecond: props.millisecond }} />
);
Default.args = {
  day: 18720,
  millisecond: 84493631,
};
