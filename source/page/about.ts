import * as ui from "../ui";
import { VNode, h } from "maquette";

const gitHubLink: VNode = h(
  "a",
  {
    class: "about__github-link",
    href: "https://github.com/narumincho/Definy",
    key: "aboutGithubLink",
  },
  [
    ui.gitHubIcon({ color: "#ddd", class: "about__github-icon" }),
    h("div", { key: "link-name" }, ["GitHub: narumincho/Definy"]),
  ]
);

export const view = (): VNode =>
  h("div", { class: "about__root", key: "about" }, [
    h("div", { key: "about" }, ["DefinyはWebアプリのためのWebアプリです"]),
    gitHubLink,
  ]);
