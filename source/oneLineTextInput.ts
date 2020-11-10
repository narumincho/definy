import { ChangeEvent, FunctionComponent, createElement as h } from "react";
import styled from "styled-components";

export const OneLineTextInput: FunctionComponent<{
  name: string;
  value: string;
  onChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
}> = (props) =>
  h(StyledOneLineTextInput, {
    name: props.name,
    onChange: (mouseEvent: ChangeEvent<HTMLInputElement>) =>
      props.onChange((mouseEvent.target as HTMLInputElement).value, mouseEvent),
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
