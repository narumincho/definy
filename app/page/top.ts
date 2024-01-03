import { h } from "https://esm.sh/preact@10.19.3";
import { Language } from "../location.ts";

export const Top = (props: {
  readonly hl: Language;
}) => {
  return h(
    "div",
    {},
    `ここはトップページ. 最近投稿されたアイデアなどを表示したい hl=${props.hl}`,
  );
};
