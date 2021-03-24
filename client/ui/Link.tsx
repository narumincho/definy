import * as React from "react";
import * as d from "../../data";
import { CSSObject, css } from "@emotion/css";

export const Link: React.FC<{
  location: d.Location;
  language?: d.Language;
  style: CSSObject;
  jumpHandler?: (location: d.Location, language: d.Language) => void;
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
