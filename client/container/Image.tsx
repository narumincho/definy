import * as React from "react";
import * as d from "../../data";
import { css } from "@emotion/css";

export const Image: React.VFC<{
  imageHash: d.ImageHash;
  alt: string;
  width: number;
  height: number;
}> = (props) => {
  return (
    <div
      className={css({
        width: props.width,
        height: props.height,
        backgroundColor: "#66a2a5",
        border: "solid 4px #3e6365",
      })}
    ></div>
  );
};
