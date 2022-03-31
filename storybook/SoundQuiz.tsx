import * as React from "react";
import { Meta, Story } from "@storybook/react";
import { SoundQuiz } from "../client/tool/SoundQuiz";

const meta: Meta = {
  title: "Tool/SoundQuiz",
  component: SoundQuiz,
};
export default meta;

export const Default: Story<never> = () => <SoundQuiz />;
