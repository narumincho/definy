import * as React from "react";
import * as d from "../../localData";
import { CSSObject, css } from "@emotion/css";
import { locationAndLanguageToUrl } from "../url";

export const Link = React.memo(
  (props: {
    readonly locationAndLanguage: d.LocationAndLanguage;
    readonly style?: CSSObject;
    readonly onJump: (urlData: d.LocationAndLanguage) => void;
    readonly isActive?: boolean;
    readonly children: React.ReactNode;
  }): React.ReactElement => {
    return (
      <a
        className={css(
          {
            backgroundColor: props.isActive ? "#f0932b" : "#333",
            color: props.isActive ? "#000" : "#ddd",
            "&:hover": {
              backgroundColor: props.isActive ? "#f69d3a" : "#444",
              color: props.isActive ? "#000" : "#dfdfdf",
            },
            cursor: "pointer",
            textDecoration: "none",
            display: "block",
          },
          props.style
        )}
        onClick={(mouseEvent) => {
          /*
           * リンクを
           * Ctrlなどを押しながらクリックか,
           * マウスの中ボタンでクリックした場合などは, ブラウザで新しいタブが開くので, ブラウザでページ推移をしない.
           */
          if (
            mouseEvent.ctrlKey ||
            mouseEvent.metaKey ||
            mouseEvent.shiftKey ||
            mouseEvent.button !== 0
          ) {
            return;
          }
          mouseEvent.preventDefault();
          props.onJump(props.locationAndLanguage);
        }}
        href={locationAndLanguageToUrl(props.locationAndLanguage).toString()}
      >
        {props.children}
      </a>
    );
  }
);
Link.displayName = "Link";
