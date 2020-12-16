import * as viewUtil from "./view/viewUtil";
import { CSSObject, SerializedStyles, css, jsx } from "@emotion/react";
import { Element } from "./view/view";
import { FunctionComponent } from "react";

export const Button: FunctionComponent<{
  onClick: undefined | (() => void);
  css?: SerializedStyles;
}> = (props) =>
  jsx(
    "button",
    {
      onClick: props.onClick,
      css: css(
        {
          cursor: "pointer",
          border: "none",
          padding: 8,
          textAlign: "left",
          fontSize: 16,
          backgroundColor: "#333",
          color: "#ddd",
          "&:hover": {
            backgroundColor: "#444",
            color: "#dfdfdf",
          },
        },
        props.css
      ),
    },
    props.children
  );

export const button = (
  option: { style?: CSSObject; hoverStyle?: CSSObject },
  children: string | ReadonlyMap<string, Element<never>>
): Element<undefined> =>
  viewUtil.button(
    {
      style: {
        cursor: "pointer",
        border: "none",
        padding: 8,
        textAlign: "left",
        fontSize: 16,
        backgroundColor: "#333",
        color: "#ddd",
        ...option.style,
        "&:hover": {
          backgroundColor: "#444",
          color: "#dfdfdf",
          ...option.hoverStyle,
        },
      },
      click: undefined,
    },
    children
  );
