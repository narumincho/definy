import { FunctionComponent, createElement as h } from "react";
import { GitHubIcon } from "./gitHubIcon";
import styled from "styled-components";

export const PageAbout: FunctionComponent<Record<never, never>> = () =>
  h(StyledPageAbout, {}, [
    h("div", { key: "about" }, "DefinyはWebアプリのためのWebアプリです"),
    h(GitHubRepositoryLink, { key: "link" }),
  ]);

const StyledPageAbout = styled.div({
  padding: 16,
});

const GitHubRepositoryLink: FunctionComponent<Record<never, never>> = () =>
  h(
    StyledGitHubRepositoryLink,
    {
      href: "https://github.com/narumincho/Definy",
    },
    [
      h(StyledGitHubIcon, { color: "#ddd", key: "icon" }),
      h("div", { key: "text" }, ["GitHub: narumincho/Definy"]),
    ]
  );

const StyledGitHubRepositoryLink = styled.a({
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
});

const StyledGitHubIcon = styled(GitHubIcon)({
  width: 16,
  height: 16,
});
