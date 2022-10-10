import * as React from "react";
import { CSSObject, css } from "@emotion/react";
import NextLink from "next/link";
import { zodType } from "../deno-lib/npm";
import { zodTypeLocationAndLanguageToUrl } from "../common/url";

export const Link = (props: {
  readonly location: zodType.Location;
  readonly language: zodType.Language;
  readonly style?: CSSObject;
  readonly isActive?: boolean;
  readonly children: React.ReactNode;
}): React.ReactElement => {
  return (
    <NextLink
      href={zodTypeLocationAndLanguageToUrl(props.location, props.language)}
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
