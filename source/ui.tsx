/** @jsx jsx */

import * as React from "react";
import * as common from "definy-common";
import { Css, jsx } from "react-free-style";
import { Maybe, UrlData } from "definy-common/source/data";

export const backgroundColorDark = "#2f2f2f";

export const backgroundColorBlack = "#000";

export const Link: React.FC<{
  urlData: UrlData;
  onJump: (urlData: UrlData) => void;
  css?: Css;
}> = (prop): JSX.Element => (
  <a
    css={{
      display: "block",
      textDecoration: "none",
      color: "#ddd",
      "&:hover": { color: "#fff" },
      ...prop.css,
    }}
    href={common
      .urlDataAndAccessTokenToUrl(prop.urlData, Maybe.Nothing())
      .toString()}
    onClick={(event) => {
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        event.button === 0
      ) {
        event.preventDefault();
        prop.onJump(prop.urlData);
      }
    }}
  >
    {prop.children}
  </a>
);

export const Button: React.FC<{
  css?: Css;
  onClick: () => void;
}> = (prop) => (
  <button
    css={{
      cursor: "pointer",
      border: "none",
      padding: 0,
      textAlign: "left",
      ...prop.css,
    }}
    onClick={prop.onClick}
    type="button"
  >
    {prop.children}
  </button>
);

export const LoadingBox: React.FC<Record<never, never>> = (prop) => (
  <div css={{ display: "grid" }}>
    {prop.children}
    <LoadingIcon css={{ justifySelf: "center" }} />
  </div>
);

export const LoadingIcon: React.FC<{ css?: Css }> = (prop) => (
  <div
    css={{
      ...prop.css,
      width: 96,
      height: 96,
      display: "grid",
      justifyItems: "center",
      alignItems: "center",
      borderRadius: "50%",
      animationName: "loading",
      animationIterationCount: "infinite",
      animationDuration: "1s",
      animationTimingFunction: "linear",
      fontSize: 24,
      padding: 8,
      backgroundColor: backgroundColorDark,
    }}
  >
    Definy
  </div>
);
