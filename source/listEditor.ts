import {
  Editor,
  EditorProps,
  editorToReactElement,
  simpleStyleToCss,
} from "./ui";
import { css, jsx as h } from "@emotion/react";
import { Button } from "./button";
import { FunctionComponent } from "react";

export const createListEditor = <T>(
  param: (
    | { isLazy: true; editor: () => Editor<T> }
    | { isLazy: false; editor: Editor<T> }
  ) & {
    initValue: T;
    displayName: string;
  }
): Editor<ReadonlyArray<T>> => {
  const editor = (props: EditorProps<ReadonlyArray<T>>) => {
    if (props.value.length === 0) {
      return h(
        "div",
        { css: listEditorStyle },
        h(AddButton, {
          onClick: () => props.onChange([param.initValue]),
        })
      );
    }
    const itemEditorComponent = param.isLazy ? param.editor() : param.editor;
    return h(
      "div",
      { css: listEditorStyle },
      props.value.map((item, index) => {
        return h(
          "div",
          { key: index.toString(), css: itemStyle },
          editorToReactElement(itemEditorComponent, {
            value: item,
            onChange: (newItem) => {
              props.onChange([
                ...props.value.slice(0, index),
                newItem,
                ...props.value.slice(index + 1),
              ]);
            },
            name: props.name + "-" + index.toString(),
            key: index.toString() + "-editor",
            model: props.model,
          }),
          h(
            Button,
            {
              css: css({
                width: 32,
              }),
              onClick: () => {
                props.onChange([
                  ...props.value.slice(0, index),
                  ...props.value.slice(index + 1),
                ]);
              },
              key: index.toString() + "-delete-button",
            },
            "x"
          )
        );
      }),
      h(AddButton, {
        onClick: () => props.onChange([...props.value, param.initValue]),
        key: "add-button",
      })
    );
  };
  editor.displayName = param.displayName;
  return editor;
};

const listEditorStyle = simpleStyleToCss({
  padding: 8,
  direction: "y",
});

const itemStyle = simpleStyleToCss({
  padding: 4,
  direction: "x",
  xGridTemplate: [{ _: "OneFr" }, { _: "Fix", value: 32 }],
});

const AddButton: FunctionComponent<{ onClick: () => void }> = (props) =>
  h(
    Button,
    {
      onClick: props.onClick,
      key: "add",
    },
    "+"
  );
