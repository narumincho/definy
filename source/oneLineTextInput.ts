import { Element } from "./view/view";
import { inputOneLineText } from "./view/viewUtil";

export const oneLineTextEditor = <Message>(
  value: string,
  onInput: (text: string) => Message
): Element<Message> =>
  inputOneLineText({
    value,
    input: onInput,
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
  });
