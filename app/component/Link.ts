import { ComponentChildren, h } from "https://esm.sh/preact@10.19.3";
import {
  Location,
  locationToPathAndQuery,
  pathAndQueryToPathAndQueryString,
} from "../location.ts";

export const Link = (
  props: {
    readonly location: Location;
    readonly children: ComponentChildren;
    /** @default false */
    readonly removeUnderline?: boolean;
    readonly onLocationMove: (location: Location) => void;
  },
) => {
  return h("a", {
    href: pathAndQueryToPathAndQueryString(
      locationToPathAndQuery(props.location),
    ),
    onClick: (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      e.preventDefault();
      props.onLocationMove(props.location);
    },
    ...(props.removeUnderline ? { "style": "text-decoration:none" } : {}),
  }, props.children);
};
