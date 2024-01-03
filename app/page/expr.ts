import { h } from "https://esm.sh/preact@10.19.3";
import { Language } from "../location.ts";

export const ExprPage = (props: {
  readonly hl: Language;
  readonly expr: string;
}) => {
  return h(
    "div",
    {},
    `ここは式とその結果を共有するときに使うページ. 1+1=2とかね. 画像の加工とか. 式はqueryにデータ実体を含める. hl=${props.hl}`,
  );
};
