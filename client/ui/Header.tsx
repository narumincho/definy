import * as React from "react";
import * as d from "../../data";
import { Link } from "./Link";
import { css } from "@emotion/css";

export const Header: React.VFC<{
  language: d.Language;
  onJump: (urlData: d.UrlData) => void;
}> = (props) => {
  return (
    <div
      className={css({
        height: 48,
        backgroundColor: "#333",
        display: "grid",
        gridAutoFlow: "column",
        alignItems: "center",
      })}
    >
      <Link
        style={{
          justifySelf: "start",
          padding: 8,
          color: "#b9d09b",
          fontSize: 32,
          lineHeight: 1,
          fontFamily: "Hack",
        }}
        urlData={{
          language: props.language,
          location: d.Location.Home,
        }}
        onJump={props.onJump}
      >
        Definy
      </Link>
    </div>
  );
};
