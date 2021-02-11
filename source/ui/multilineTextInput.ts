import { Element } from "@narumincho/html/view";
import { inputMultiLineText } from "@narumincho/html/viewUtil";

export const multiLineTextEditor = <Message>(
  option: { id?: string },
  value: string,
  inputOrReadonly: ((text: string) => Message) | null
): Element<Message> =>
  inputMultiLineText({
    value,
    inputOrReadonly,
    style: {
      padding: 8,
      fontSize: 16,
      border: "2px solid #222",
      backgroundColor: "#000",
      color: "#ddd",
      borderRadius: 8,
      resize: "none",
      lineHeight: 1.5,
      height: 320,

      "&:focus": {
        border: "2px solid #f0932b",
        outline: "none",
      },
    },
    id: option.id,
  });
