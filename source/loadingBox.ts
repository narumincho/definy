import { FunctionComponent, createElement as h } from "react";
import styled, { keyframes } from "styled-components";

export type Props = {
  readonly message: string;
};

export const LoadingBox: FunctionComponent<Props> = (props) =>
  h(StyledLoadingBox, {}, [
    props.message,
    h(LoadingLogo, { key: "definy" }, "Definy"),
  ]);

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

const LoadingLogo = styled.div`
  width: 96px;
  height: 96px;
  display: grid;
  justify-items: center;
  align-items: center;
  border-radius: 50%;
  animation: 1s ${rotateAnimation} infinite linear;
  font-size: 24px;
  padding: 8;
  background-color: #333;
  color: #ddd;
`;
