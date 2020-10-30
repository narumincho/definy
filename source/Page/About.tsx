import * as ui from "../ui";
import { VNode, h } from "maquette";

const GitHubLink: VNode = h(
  "a",
  { class: "about__github-link", href: "https://github.com/narumincho/Definy" },
  [
    h("div", { class: "about__github-icon" }, [ui.gitHubIcon("#ddd")]),
    h("div", {}, ["GitHub: narumincho/Definy"]),
  ]
);

export const About: VNode = h("div", { class: "about__root" }, [
  h("div", {}, ["DefinyはWebアプリのためのWebアプリです"]),
  GitHubLink,
]);
