import * as d from "definy-core/source/data";
import { AppInterface, TitleAndElement } from "./appInterface";
import { c, div, externalLink } from "./view/viewUtil";
import { Element } from "./view/view";
import { gitHubIcon } from "./ui";

export const view = (appInterface: AppInterface): TitleAndElement => ({
  title: "Definyについて",
  element: div(
    {
      style: {
        display: "grid",
        alignContent: "start",
        padding: 16,
        gap: 8,
      },
    },
    c([
      ["about", div({}, aboutMessage(appInterface.language))],
      ["link-client", gitHubRepositoryLink("narumincho", "Definy")],
      [
        "link-functions",
        gitHubRepositoryLink("narumincho", "definy-functions"),
      ],
      ["link-core", gitHubRepositoryLink("narumincho", "definy-core")],
      ["link-html", gitHubRepositoryLink("narumincho", "html")],
      [
        "link-typed-admin-firestore",
        gitHubRepositoryLink("narumincho", "typed-admin-firestore"),
      ],
      [
        "link-js-ts-code-generator",
        gitHubRepositoryLink("narumincho", "js-ts-code-generator"),
      ],
      [
        "link-elm-code-generator",
        gitHubRepositoryLink("narumincho", "elm-code-generator"),
      ],
    ])
  ),
});

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

const gitHubRepositoryLink = (
  repoUser: string,
  repoName: string
): Element<never> =>
  externalLink(
    {
      url: new URL("https://github.com/" + repoUser + "/" + repoName),
      style: {
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
      },
    },
    c([
      [
        "icon",
        gitHubIcon({
          color: "#ddd",
          width: 32,
          height: 32,
        }),
      ],
      ["text", div({}, "GitHub: " + repoUser + "/" + repoName)],
    ])
  );
