import { h } from "https://esm.sh/preact@10.19.3";
import { Language } from "../location.ts";

export const About = (props: {
  readonly hl: Language;
}) => {
  return h(
    "div",
    {},
    `ここはバージョンやGitHubのリンク, ライセンスなどを表示したい hl=${props.hl}`,
  );
};
