import { ChangeEvent, createElement as h } from "react";
import { Editor } from "./ui";
import styled from "styled-components";

export const OneLineTextInput: Editor<string> = (props) =>
  h(StyledOneLineTextInput, {
    name: props.name,
    onChange: (mouseEvent: ChangeEvent<HTMLInputElement>) =>
      props.onChange(mouseEvent.target.value),
    value: props.value,
  });

const StyledOneLineTextInput = styled.input({
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
});
