import * as commonUrl from "../../common/url";
import * as d from "../../data";
import { Message, State, messageJumpTag } from "../messageAndState";
import { CSSObject } from "@emotion/css";
import { Element } from "@narumincho/html/view";
import { Theme } from "../ui";
import { localLink } from "@narumincho/html/viewUtil";

const themeToStyle = (
  theme: Theme
): {
  color: string;
  backgroundColor: string;
  "&:hover": {
    backgroundColor: string;
    color: string;
  };
} => {
  switch (theme) {
    case "Gray":
      return {
        backgroundColor: "#333",
        color: "#ddd",
        "&:hover": {
          backgroundColor: "#444",
          color: "#dfdfdf",
        },
      };
    case "Black":
      return {
        backgroundColor: "#000",
        color: "#ddd",
        "&:hover": {
          backgroundColor: "#111",
          color: "#dfdfdf",
        },
      };
    case "Active":
      return {
        backgroundColor: "#f0932b",
        color: "#000",
        "&:hover": {
          backgroundColor: "#f69d3a",
          color: "#000",
        },
      };
  }
};

export const link = (
  option: {
    readonly appInterface: State;
    readonly location: d.Location;
    readonly language?: d.Language;
    readonly theme: Theme;
    readonly style?: CSSObject;
    readonly hoverStyle?: CSSObject;
  },
  children: ReadonlyMap<string, Element<never>> | string
): Element<Message> => {
  const urlData: d.UrlData = {
    language: option.language ?? option.appInterface.language,
    location: option.location,
  };

  return localLink<Message>(
    {
      url: commonUrl.urlDataAndAccountTokenToUrl(urlData, d.Maybe.Nothing()),
      style: {
        display: "block",
        textDecoration: "none",
        ...themeToStyle(option.theme),
        ...option.style,
        "&:hover": {
          ...themeToStyle(option.theme)["&:hover"],
          ...option.hoverStyle,
        },
      },
      jumpMessage: {
        tag: messageJumpTag,
        location: urlData.location,
        language: urlData.language,
      },
    },
    children
  );
};
