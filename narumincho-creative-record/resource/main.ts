import { portNumber } from "../distributionPath";
import { staticResourcePathObjectToUrlObject } from "../../gen/view/util";

export const staticResourcePathObject = {
  icon: "icon.png",
  definy20190212: "definy20190212.png",
  definy20210811: "definy20210811.png",
  gravityStar: "gravity-star.png",
  tsukumart: "tsukumart.png",
} as const;

export const resourceUrl = staticResourcePathObjectToUrlObject(
  staticResourcePathObject,
  portNumber
);
