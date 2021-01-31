import { Element } from "@narumincho/html/view";
import { inputOneLineText } from "@narumincho/html/viewUtil";

export const oneLineTextEditor = <Message>(
  option: { id?: string },
  value: string,
  inputOrReadonly: ((text: string) => Message) | null
): Element<Message> =>
  inputOneLineText({
    value,
    inputOrReadonly,
    style: {
      padding: 8,
      fontSize: 16,
      border: "2px solid #222",
      backgroundColor: "#000",
      color: "#ddd",
      borderRadius: 8,
      width: "100%",
      "&:focus": {
        border: "2px solid #f0932b",
        outline: "none",
      },
    },
    id: option.id,
  });
