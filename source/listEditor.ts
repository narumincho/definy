import { Editor, styledDiv } from "./ui";
import { Button } from "./button";
import { createElement as h } from "react";
import styled from "styled-components";

export const createListEditor = <T>(
  itemEditorComponent: Editor<T>,
  itemInitValue: T
): Editor<ReadonlyArray<T>> => (props) => {
  return h(
    StyledListEditor,
    {},
    props.value.map((item, index) => {
      return h(
        Item,
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
          DeleteButton,
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

const StyledListEditor = styledDiv({
  padding: 8,
  direction: "y",
});

const Item = styledDiv({
  padding: 4,
  direction: "x",
  xGridTemplate: [{ _: "OneFr" }, { _: "Fix", value: 32 }],
});

const DeleteButton = styled(Button)({
  width: 32,
});
