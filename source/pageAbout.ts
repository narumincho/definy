import { css, jsx as h } from "@emotion/react";
import { FunctionComponent } from "react";
import { GitHubIcon } from "./gitHubIcon";

export const PageAbout: FunctionComponent<Record<never, never>> = () =>
  h(
    "div",
    {
      css: css({
        padding: 16,
      }),
    },
    [
      h("div", { key: "about" }, "DefinyはWebアプリのためのWebアプリです"),
      h(GitHubRepositoryLink, { key: "link" }),
    ]
  );

const GitHubRepositoryLink: FunctionComponent<Record<never, never>> = () =>
  h(
    "a",
    {
      href: "https://github.com/narumincho/Definy",
      css: css({
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 8,
        padding: 16,
        color: "#ddd",
        backgroundColor: "#333",
        borderRadius: 8,
        textDecoration: "none",
        alignItems: "center",
        "&:hover": {
          color: "#dfdfdf",
          backgroundColor: "#444",
        },
      }),
    },
    [
      h(GitHubIcon, {
        color: "#ddd",
        key: "icon",
        css: css({
          width: 16,
          height: 16,
        }),
      }),
      h("div", { key: "text" }, ["GitHub: narumincho/Definy"]),
    ]
  );
