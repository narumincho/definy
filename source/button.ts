import * as viewUtil from "@narumincho/html/source/viewUtil";
import { CSSObject } from "@emotion/css";
import { Element } from "@narumincho/html/source/view";

export const button = <Message>(
  option: { style?: CSSObject; hoverStyle?: CSSObject; click: Message },
  children: string | ReadonlyMap<string, Element<Message>>
): Element<Message> =>
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
      click: option.click,
    },
    children
  );
