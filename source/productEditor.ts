import { Editor, EditorProps, simpleStyleToCss } from "./ui";
import { FunctionComponent, ReactElement } from "react";
import { jsx as h } from "@emotion/react";

export const createProductEditor = <T extends Record<string, unknown>>(
  memberComponentObject: {
    [key in keyof T]: Editor<T[key]>;
  },
  displayName: string
): Editor<T> => {
  const editor = (props: EditorProps<T>): ReactElement => {
    return h(
      "div",
      {
        css: simpleStyleToCss({
          direction: "y",
          padding: 0,
          border: { width: 1, color: "#ddd" },
        }),
      },
      Object.entries(memberComponentObject).map(
        <memberT>([memberName, memberEditor]: [string, Editor<memberT>]) =>
          h(
            NameContainer,
            { name: memberName, key: memberName },
            h(memberEditor, {
              name: props.name + "-" + memberName,
              model: props.model,
              value: props.value[memberName] as memberT,
              onChange: (newMemberValue: memberT) => {
                props.onChange({
                  ...props.value,
                  [memberName]: newMemberValue,
                });
              },
            })
          )
      )
    );
  };
  editor.displayName = displayName;
  return editor;
};

const NameContainer: FunctionComponent<{ name: string }> = (props) =>
  h(
    "div",
    {
      css: simpleStyleToCss({
        padding: 16,
        direction: "y",
      }),
    },
    h("div", { key: "name" }, props.name),
    props.children
  );
