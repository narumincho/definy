import { h } from "https://esm.sh/preact@10.19.3";
import { Language } from "../location.ts";

export const IdPage = (props: {
  readonly hl: Language;
  readonly id: string;
}) => {
  return h(
    "div",
    {},
    `ここはアイデア/アカウント/モジュール/パーツの詳細ページや編集など hl=${props.hl}`,
  );
};
