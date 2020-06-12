/** @jsx jsx */

import * as React from "react";
import * as ui from "./ui";
import { data } from "definy-common";
import { jsx } from "react-free-style";

const sidePanelWidth = 260;

export const SidePanel: React.FC<{
  urlData: data.UrlData;
  onJump: (urlData: data.UrlData) => void;
}> = (prop) => (
  <div
    css={{
      width: sidePanelWidth,
      backgroundColor: ui.backgroundColorDark,
      height: "100%",
    }}
  >
    <Logo onJump={prop.onJump} urlData={prop.urlData} />
    <LogInButton />
    <ui.Link
      onJump={prop.onJump}
      urlData={{ ...prop.urlData, location: data.Location.About }}
    >
      <div>About</div>
    </ui.Link>
  </div>
);

SidePanel.displayName = "SidePanel";

const Logo: React.FC<{
  onJump: (urlData: data.UrlData) => void;
  urlData: data.UrlData;
}> = (prop) => (
  <ui.Link
    onJump={prop.onJump}
    urlData={{ ...prop.urlData, location: data.Location.Home }}
  >
    <div css={{ color: "#b9d09b", fontSize: 32 }}>Definy</div>
  </ui.Link>
);

const LogInButton = () => (
  <div css={{ display: "grid", gap: 8, padding: 8 }}>
    <GoogleButton />
    <GitHubButton />
  </div>
);

const GoogleButton = () => (
  <div
    css={{
      display: "grid",
      gridTemplateColumns: "48px 1fr",
      backgroundColor: "#4285f4",
      borderRadius: 8,
      gap: 8,
    }}
  >
    <div
      css={{
        width: 48,
        height: 48,
        padding: 8,
        backgroundColor: "#fff",
        borderRadius: 8,
      }}
    >
      <GoogleIcon />
    </div>
    <div css={{ alignSelf: "center", fontSize: 18 }}>Sign in with Google</div>
  </div>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 20 20">
    <path
      d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
      fill="rgb(66, 133, 244)"
    />
    <path
      d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
      fill="rgb(52, 168, 83)"
    />
    <path
      d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
      fill="rgb(251, 188, 5)"
    />
    <path
      d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
      fill="rgb(234, 67, 53)"
    />
  </svg>
);

const GitHubButton = () => (
  <div
    css={{
      display: "grid",
      gridTemplateColumns: "48px 1fr",
      backgroundColor: "#202020",
      borderRadius: 8,
      gap: 8,
    }}
  >
    <div
      css={{
        width: 48,
        height: 48,
        padding: 8,
        backgroundColor: "#fff",
        borderRadius: 8,
      }}
    >
      <GitHubIcon />
    </div>
    <div css={{ alignSelf: "center", fontSize: 18 }}>Sign in with GitHub</div>
  </div>
);

const GitHubIcon = () => (
  <svg className="_7a20794b" viewBox="0 0 20 20">
    <path
      d="M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10"
      fill="rgb(0, 0, 0)"
    />
  </svg>
);
