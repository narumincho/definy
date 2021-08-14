import * as React from "react";
import * as d from "../../localData";
import { css } from "@emotion/css";
import { pngFilePath } from "../../common/url";

export const Image: React.VFC<{
  imageHash: d.ImageHash;
  alt: string;
  width: number;
  height: number;
  isCircle?: boolean;
}> = React.memo((props) => {
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
});
Image.displayName = "Image";

export const ImageSkeleton: React.VFC<{
  width: number;
  height: number;
}> = React.memo((props) => {
  return (
    <div
      className={css({
        width: props.width,
        height: props.height,
        backgroundColor: "#444",
      })}
    ></div>
  );
});
ImageSkeleton.displayName = "ImageSkeleton";
