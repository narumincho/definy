import { h } from "https://esm.sh/preact@10.19.3";
import { Language } from "../location.ts";
import { Header } from "../component/Header.ts";
import { LogInState } from "../component/LogInStateView.ts";
import { Location } from "../location.ts";

export const About = (props: {
  readonly hl: Language;
  readonly logInState: LogInState;
  readonly onLocationMove: (location: Location) => void;
}) => {
  return h(
    "div",
    {},
    h(Header, {
      logInState: props.logInState,
      hl: props.hl,
      onLocationMove: props.onLocationMove,
    }),
    h(
      "div",
      { style: "padding:8px" },
      h(
        "h1",
        {},
        {
          en: "About definy",
          eo: "Pri definy",
          ja: "definy について",
        }[props.hl],
      ),
      h(
        "div",
        {},
        {
          en:
            `"Programming language + development environment that is not limited to strings" being developed by Narumincho. Under development...`,
          eo:
            `"Programlingvo + disvolva medio kiu ne estas limigita al ŝnuroj" disvolvata de Narumincho. Sub evoluo...`,
          ja:
            "ナルミンチョが開発している「文字列にとらわれないプログラミング言語+開発環境」. 開発中...",
        }[props.hl],
      ),
      h(
        "div",
        {},
        h("a", { href: "https://github.com/narumincho/definy" }, "GitHub"),
      ),
      h(
        "h2",
        {},
        { en: "License", eo: "Permesilo", ja: "ライセンス" }[props.hl],
      ),
      h(
        "div",
        {},
        h("span", {}, "Hack typeface "),
        h(
          "a",
          { href: "https://github.com/source-foundry/Hack" },
          "https://github.com/source-foundry/Hack",
        ),
      ),
    ),
  );
};
