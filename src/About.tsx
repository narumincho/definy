/** @jsx jsx */

import * as React from "react";
import * as ui from "./ui";
import { jsx } from "react-free-style";

export const About: React.FC<Record<never, never>> = () => {
  return (
    <div css={{ padding: 16 }}>
      <div>DefinyはWebアプリのためのWebアプリです </div>
      <GitHubLink />
    </div>
  );
};

const GitHubLink = () => {
  const theme = ui.areaThemeToValue("Gray");

  return (
    <a
      css={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 8,
        padding: 16,
        color: theme.color,
        backgroundColor: theme.backgroundColor,
        "&:hover": {
          color: theme.hoveredColor,
          backgroundColor: theme.hoveredBackgroundColor,
        },
        borderRadius: 8,
        textDecoration: "none",
      }}
      href="https://github.com/narumincho/Definy"
    >
      <div css={{ width: 32, height: 32 }}>
        <ui.GitHubIcon color="#ddd" />
      </div>
      <div css={{ alignSelf: "center" }}>GitHub: narumincho/Definy</div>
    </a>
  );
};
