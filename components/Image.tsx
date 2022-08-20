import * as React from "react";
import * as d from "../localData";
import { pngFilePath } from "../common/url";

export const Image: React.FC<{
  imageHash: d.ImageHash;
  alt: string;
  width: number;
  height: number;
  isCircle?: boolean;
}> = (props) => {
  return (
    <img
      alt={props.alt}
      css={{
        width: props.width,
        height: props.height,
        backgroundColor: "#66a2a5",
        borderRadius: props.isCircle ? "50%" : 0,
      }}
      src={pngFilePath(props.imageHash)}
    />
  );
};

export const ImageSkeleton: React.FC<{
  width: number;
  height: number;
}> = (props) => {
  return (
    <div
      css={{
        width: props.width,
        height: props.height,
        backgroundColor: "#444",
      }}
    ></div>
  );
};
