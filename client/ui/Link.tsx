import * as React from "react";
import * as d from "../../data";
import { CSSObject, css } from "@emotion/css";
import { urlDataAndAccountTokenToUrl } from "../../common/url";

export const Link: React.FC<{
  urlData: d.UrlData;
  style: CSSObject;
  onJump: (urlData: d.UrlData) => void;
}> = (props) => {
  return (
    <a
      className={css(
        {
          backgroundColor: "#333",
          color: "#ddd",
          "&:hover": {
            backgroundColor: "#444",
            color: "#dfdfdf",
          },
          cursor: "pointer",
          textDecoration: "none",
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
        props.onJump(props.urlData);
      }}
      href={urlDataAndAccountTokenToUrl(
        props.urlData,
        d.Maybe.Nothing()
      ).toString()}
    >
      {props.children}
    </a>
  );
};
