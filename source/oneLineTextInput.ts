import { css, jsx as h } from "@emotion/react";
import { ChangeEvent } from "react";
import { Editor } from "./ui";

export const OneLineTextInput: Editor<string> = (props) => {
  if (typeof props.value !== "string") {
    throw new Error(
      "OneLineTextInput need string value. value =" +
        JSON.stringify(props.value)
    );
  }
  return h("input", {
    name: props.name,
    onChange: (mouseEvent: ChangeEvent<HTMLInputElement>) =>
      props.onChange(mouseEvent.target.value),
    value: props.value,
    css: css({
      padding: 8,
      fontSize: 16,
      border: "2px solid #222",
      backgroundColor: "#000",
      color: "#ddd",
      borderRadius: 8,
      "&:focus": {
        border: "2px solid #f0932b",
        outline: "none",
      },
    }),
  });
};
