import * as React from "react";
import * as d from "../../data";
import { css } from "@emotion/css";
import { pngFilePath } from "../../common/url";

export const Image: React.VFC<{
  imageHash: d.ImageHash;
  alt: string;
  width: number;
  height: number;
}> = (props) => {
  return (
    <img
      className={css({
        width: props.width,
        height: props.height,
        backgroundColor: "#66a2a5",
      })}
      src={pngFilePath(props.imageHash)}
    />
  );
};

export const ImageSkeleton: React.VFC<{
  width: number;
  height: number;
}> = (props) => {
  return (
    <div
      className={css({
        width: props.width,
        height: props.height,
        backgroundColor: "#444",
      })}
    ></div>
  );
};
