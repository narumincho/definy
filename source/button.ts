import { FunctionComponent, createElement as h } from "react";
import styled from "styled-components";

export const Button: FunctionComponent<{
  onClick: undefined | (() => void);
  className?: string;
}> = (props) =>
  h(
    StyledButton,
    {
      onClick: props.onClick,
      className: props.className,
    },
    props.children
  );

const StyledButton = styled.button({
  cursor: "pointer",
  border: "none",
  padding: 8,
  textAlign: "left",
  fontSize: 16,
  backgroundColor: "#333",
  color: "#ddd",
  "&:hover": {
    backgroundColor: "#444",
    color: "#dfdfdf",
  },
});
