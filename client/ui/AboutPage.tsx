import * as React from "react";
import * as d from "../../data";
import { css } from "@emotion/css";

export type Props = {
  language: d.Language;
};

export const AboutPage: React.VFC<Props> = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        overflowY: "scroll",
        alignContent: "start",
        gap: 8,
        padding: 16,
      })}
    >
      <div>{aboutMessage(props.language)}</div>
      <GitHubRepositoryLink githubAccountName="narumincho" repoName="Definy" />
    </div>
  );
};

const aboutMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return "Definy is Web App for Web App";
    case "Japanese":
      return "DefinyはWebアプリのためのWebアプリです";
    case "Esperanto":
      return "Definy estas TTT-programo por TTT-programo";
  }
};

const GitHubRepositoryLink: React.VFC<{
  githubAccountName: string;
  repoName: string;
}> = (props) => (
  <a
    href={new URL(
      "https://github.com/" + props.githubAccountName + "/" + props.repoName
    ).toString()}
    className={css({
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
    })}
  >
    <GitHubIcon color="#ddd" width={32} height={32} />
    <div>
      GitHub: {props.githubAccountName} / {props.repoName}
    </div>
  </a>
);

/**
 * GitHubのアイコン
 */
export const GitHubIcon: React.VFC<{
  color: string;
  width: number;
  height: number;
  padding?: number;
  backgroundColor?: string;
  borderRadius?: number;
}> = (props) => (
  <svg
    viewBox="0 0 20 20"
    className={css({
      width: props.width,
      height: props.height,
      padding: props.padding,
      backgroundColor: props.backgroundColor,
      borderRadius: props.borderRadius,
    })}
  >
    <path
      d="M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10"
      fill={props.color}
    />
  </svg>
);