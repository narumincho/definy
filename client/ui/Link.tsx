import * as React from "react";
import * as d from "../../data";
import { CSSObject, css } from "@emotion/css";

export const Link: React.FC<{
  urlData: d.UrlData;
  style: CSSObject;
  jumpHandler: (urlData: d.UrlData) => void;
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
        },
        props.style
      )}
    >
      {props.children}
    </a>
  );
};
