import { Button } from "./button";
import { Editor } from "./ui";
import { createElement as h } from "react";

export const createListEditor = <T>(
  itemEditorComponent: Editor<T>,
  itemInitValue: T
): Editor<ReadonlyArray<T>> => (props) => {
  return h(
    "div",
    {},
    props.value.map((item, index) => {
      return h(
        "div",
        { key: index.toString() },
        h(itemEditorComponent, {
          value: item,
          onChange: (newItem) => {
            props.onChange([
              ...props.value.slice(0, index),
              newItem,
              ...props.value.slice(index + 1),
            ]);
          },
          name: props.name + "-" + index.toString(),
          key: "editor",
        }),
        h(
          Button,
          {
            onClick: () => {
              props.onChange([
                ...props.value.slice(0, index),
                ...props.value.slice(index + 1),
              ]);
            },
          },
          "x"
        )
      );
    }),
    h(
      Button,
      {
        onClick: () => {
          props.onChange([...props.value, itemInitValue]);
        },
        key: "add",
      },
      "+"
    )
  );
};
