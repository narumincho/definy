import {
  Editor,
  EditorProps,
  editorToReactElement,
  simpleStyleToCss,
} from "./ui";
import { css, jsx as h } from "@emotion/react";
import { ReactElement } from "react";

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
        }),
      },
      Object.entries(memberComponentObject).map(([key, component]) => [
        h(
          "label",
          { key: key + "-label", css: css({ display: "grid", padding: 8 }) },
          key
        ),
        editorToReactElement(component, {
          name: props.name + "-" + key,
          key: key + "-input",
          value: props.value[key],
          onChange: (newValue: unknown): void => {
            props.onChange({ ...props.value, [key]: newValue });
          },
          model: props.model,
        }),
      ])
    );
  };
  editor.displayName = displayName;
  return editor;
};
