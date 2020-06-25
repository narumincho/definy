/** @jsx jsx */

import * as React from "react";
import * as common from "definy-common";
import { Css, jsx } from "react-free-style";
import { ImageToken, Maybe, UrlData, UserId } from "definy-common/source/data";
import { Model } from "./model";
import { TokenResource } from "./data";

export type AreaTheme = "Gray" | "Black" | "Active";

export type AreaThemeValue = {
  readonly backgroundColor: string;
  readonly hoveredBackgroundColor: string;
  readonly color: string;
  readonly hoveredColor: string;
};

export const areaThemeToValue = (areaTheme: AreaTheme): AreaThemeValue => {
  switch (areaTheme) {
    case "Gray":
      return {
        backgroundColor: "#242424",
        hoveredBackgroundColor: "#2f2f2f",
        color: "#ddd",
        hoveredColor: "#dfdfdf",
      };
    case "Black":
      return {
        backgroundColor: "#000",
        hoveredBackgroundColor: "#111",
        color: "#ddd",
        hoveredColor: "#dfdfdf",
      };
    case "Active":
      return {
        backgroundColor: "#f0932b",
        hoveredBackgroundColor: "#f69d3a",
        color: "#000",
        hoveredColor: "#000",
      };
  }
};

export const Link: React.FC<{
  urlData: UrlData;
  onJump: (urlData: UrlData) => void;
  areaTheme: AreaTheme;
  css?: Css;
}> = (prop): JSX.Element => {
  const theme = areaThemeToValue(prop.areaTheme);
  return (
    <a
      css={{
        display: "block",
        textDecoration: "none",
        color: theme.color,
        backgroundColor: theme.backgroundColor,
        "&:hover": {
          color: theme.hoveredColor,
          backgroundColor: theme.hoveredBackgroundColor,
        },
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
};

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
  <div css={{ display: "grid", overflow: "hidden" }}>
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
      color: areaThemeToValue("Gray").color,
      backgroundColor: areaThemeToValue("Gray").backgroundColor,
    }}
  >
    Definy
  </div>
);

export const GitHubIcon: React.FC<{ color: string }> = (prop) => (
  <svg viewBox="0 0 20 20">
    <path
      d="M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10"
      fill={prop.color}
    />
  </svg>
);

export const ActiveDiv: React.FC<{ css?: Css }> = (prop) => {
  const activeTheme = areaThemeToValue("Active");
  return (
    <div
      css={{
        ...prop.css,
        backgroundColor: activeTheme.backgroundColor,
        color: activeTheme.color,
      }}
    >
      {prop.children}
    </div>
  );
};

export const Image: React.FC<{
  model: Model;
  imageToken: ImageToken;
  css?: Css;
}> = (prop) => {
  const blobUrlResource = prop.model.imageData.get(prop.imageToken);
  if (blobUrlResource === undefined) {
    return <div>...</div>;
  }
  switch (blobUrlResource._) {
    case "WaitLoading":
      return <div css={prop.css}>読み込み準備中……</div>;
    case "Loading":
      return <div css={prop.css}>読込中……</div>;
    case "WaitRequesting":
      return <div css={prop.css}>リクエスト準備中……</div>;
    case "Requesting":
      return <div css={prop.css}>リクエスト中……</div>;
    case "WaitRetrying":
      return <div css={prop.css}>再挑戦準備中</div>;
    case "Retrying":
      return <div css={prop.css}>再挑戦中</div>;
    case "Unknown":
      return <div css={prop.css}>取得に失敗</div>;
    case "Loaded":
      return <img css={prop.css} src={blobUrlResource.data} />;
  }
};

export const User: React.FC<{ model: Model; userId: UserId }> = (prop) => {
  const user = prop.model.userData.get(prop.userId);
  React.useEffect(() => {
    if (user === undefined) {
      return;
    }
    switch (user._) {
      case "WaitLoading":
      case "Loading":
      case "WaitRequesting":
      case "Requesting":
      case "WaitRetrying":
      case "Retrying":
        return;
      case "WaitUpdating":
      case "Updating":
      case "Loaded":
        if (user.data._ === "Just") {
          prop.model.requestImage(user.data.value.imageHash);
        }
    }
  });
  if (user === undefined) {
    return <div>...</div>;
  }
  switch (user._) {
    case "WaitLoading":
      return <div>WL</div>;
    case "Loading":
      return <div>L</div>;
    case "WaitRequesting":
      return <div>WReq</div>;
    case "Requesting":
      return <div>Req</div>;
    case "WaitRetrying":
      return <div>WRetry</div>;
    case "Retrying":
      return <div>Retry</div>;
    case "WaitUpdating":
      return <div>WU</div>;
    case "Updating":
      return <div>U</div>;
    case "Loaded":
      if (user.data._ === "Just") {
        return (
          <div css={{ display: "grid", gridTemplateColumns: "32px 1fr" }}>
            <Image imageToken={user.data.value.imageHash} model={prop.model} />
            {user.data.value.name}
          </div>
        );
      }
      return <div>存在しないユーザー</div>;
    case "Unknown":
      return <div>存在の確認に失敗</div>;
  }
};
