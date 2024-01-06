import { h } from "https://esm.sh/preact@10.19.3";
import { Language, Location } from "../location.ts";
import { Link } from "./Link.ts";

export const LanguageDropdown = (props: {
  readonly locationFunc: (hl: Language) => Location;
  readonly onLocationMove: (location: Location) => void;
  readonly hl: Language;
  readonly isOpen: boolean;
  readonly setIsOpen: (isOpen: boolean) => void;
}) => {
  return h(
    "div",
    { style: `position:relative` },
    h(
      "div",
      {
        style: `position:relative`,
        onClick: () => {
          props.setIsOpen(!props.isOpen);
        },
      },
      h(IconLanguage, {}),
      languageToName[props.hl] + " " + (props.isOpen ? "▲" : "▼"),
    ),
    ...(props.isOpen
      ? [h(
        "div",
        {},
        ([
          "en",
          "eo",
          "ja",
        ] as const)
          .map((hl: Language) => {
            if (hl === props.hl) {
              return h("div", {}, languageToName[hl]);
            }
            return h(
              "div",
              {},
              h(Link, {
                location: props.locationFunc(hl),
                onLocationMove: props.onLocationMove,
                children: languageToName[hl],
                key: hl,
              }),
            );
          }),
      )]
      : []),
  );
};

const languageToName: { [key in Language]: string } = {
  en: "English",
  eo: "Esperanto",
  ja: "日本語",
};

/**
 * https://tabler-icons-tsx.deno.dev/
 */
const IconLanguage = ({
  size = 24,
  color = "currentColor",
  stroke = 2,
}) => (
  h(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      class: "icon icon-tabler icon-tabler-language",
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      "stroke-width": stroke,
      stroke: color,
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    h("path", { stroke: "none", d: "M0 0h24v24H0z", fill: "none" }),
    h("path", { d: "M4 5h7" }),
    h("path", { d: "M9 3v2c0 4.418 -2.239 8 -5 8" }),
    h("path", { d: "M5 9c0 2.144 2.952 3.908 6.7 4" }),
    h("path", { d: "M12 20l4 -9l4 9" }),
    h("path", { d: "M19.1 18h-6.2" }),
  )
);
