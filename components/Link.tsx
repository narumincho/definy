import * as React from "react";
import * as d from "../localData";
import { CSSObject, css } from "@emotion/react";
import NextLink from "next/link";
import { locationAndLanguageToNodeUrlObject } from "../common/url";

export const Link = (props: {
  readonly locationAndLanguage: d.LocationAndLanguage;
  readonly style?: CSSObject;
  readonly isActive?: boolean;
  readonly children: React.ReactNode;
}): React.ReactElement => {
  return (
    <NextLink
      href={locationAndLanguageToNodeUrlObject(props.locationAndLanguage)}
      passHref
    >
      <a
        css={css(
          {
            backgroundColor: props.isActive ? "#f0932b" : "#333",
            color: props.isActive ? "#000" : "#ddd",
            "&:hover": {
              backgroundColor: props.isActive ? "#f69d3a" : "#444",
              color: props.isActive ? "#000" : "#dfdfdf",
            },
            cursor: "pointer",
            textDecoration: "none",
            display: "block",
          },
          props.style
        )}
      >
        {props.children}
      </a>
    </NextLink>
  );
};
