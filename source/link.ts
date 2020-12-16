import * as core from "definy-core";
import * as d from "definy-core/source/data";
import { AppInterface, Message, messageJumpTag } from "./appInterface";
import { CSSObject, SerializedStyles, css, jsx as h } from "@emotion/react";
import react, { Component, ReactElement } from "react";
import { Element } from "./view/view";
import { Model } from "./model";
import { Theme } from "./ui";
import { localLink } from "./view/viewUtil";

export interface Props {
  readonly model: Model;
  readonly location: d.Location;
  readonly language?: d.Language;
  readonly theme: Theme;
  readonly css?: SerializedStyles;
  readonly className?: string;
}

export class Link extends Component<Props, never> {
  onClick(event: react.MouseEvent<HTMLAnchorElement, MouseEvent>): void {
    /*
     * リンクを
     * Ctrlなどを押しながらクリックか,
     * マウスの中ボタンでクリックした場合などは, ブラウザで新しいタブが開くので, ページ推移をDefinyでしない.
     */
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    this.props.model.jump(this.props.location, this.props.model.language);
  }

  render(): ReactElement {
    return h(
      "a",
      {
        href: core
          .urlDataAndAccountTokenToUrl(
            {
              clientMode: this.props.model.clientMode,
              language: this.props.language ?? this.props.model.language,
              location: this.props.location,
            },
            d.Maybe.Nothing()
          )
          .toString(),
        onClick: (e: react.MouseEvent<HTMLAnchorElement, MouseEvent>) =>
          this.onClick(e),
        css: css(
          {
            display: "block",
            textDecoration: "none",
          },
          themeToStyle(this.props.theme),
          this.props.css
        ),
        theme: this.props.theme,
        className: this.props.className,
      },
      this.props.children
    );
  }
}

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
    readonly appInterface: AppInterface;
    readonly location: d.Location;
    readonly language?: d.Language;
    readonly theme: Theme;
    readonly style?: CSSObject;
    readonly hoverStyle?: CSSObject;
  },
  children: ReadonlyMap<string, Element<never>> | string
): Element<Message> => {
  const urlData: d.UrlData = {
    clientMode: option.appInterface.clientMode,
    language: option.language ?? option.appInterface.language,
    location: option.location,
  };

  return localLink<Message>(
    {
      url: core.urlDataAndAccountTokenToUrl(urlData, d.Maybe.Nothing()),
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
