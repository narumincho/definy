import * as React from "react";
import * as d from "../../data";
import { css } from "@emotion/css";
import { pngFilePath } from "../../common/url";

export const Image: React.VFC<{
  imageHash: d.ImageHash;
  alt: string;
  width: number;
  height: number;
  isCircle?: boolean;
}> = (props) => {
  return (
    <img
      alt={props.alt}
      className={css({
        width: props.width,
        height: props.height,
        backgroundColor: "#66a2a5",
        borderRadius: props.isCircle ? "50%" : undefined,
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
