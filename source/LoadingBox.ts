import { FunctionComponent, createElement as h } from "react";
import styled, { keyframes } from "styled-components";

export const LoadingBox: FunctionComponent<Record<never, never>> = (props) =>
  h(StyledLoadingBox, {}, [props.children, h(LoadingLogo, {}, "Definy")]);

const StyledLoadingBox = styled.div({
  display: "grid",
  overflow: "hidden",
  justifyItems: "center",
});

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(1turn);
  }
`;

const LoadingLogo = styled.div({
  width: 96,
  height: 96,
  display: "grid",
  justifyItems: "center",
  alignItems: "center",
  borderRadius: "50%",
  animation: `1s ${rotateAnimation} infinite linear`,
  fontSize: 24,
  padding: 8,
  backgroundColor: "#333",
  color: "#ddd",
});
