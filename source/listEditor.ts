import { Editor, styledDiv } from "./ui";
import { FunctionComponent, createElement as h } from "react";
import { Button } from "./button";
import styled from "styled-components";

export const createListEditor = <T>(
  param:
    | { isLazy: true; editor: () => Editor<T>; initValue: T }
    | { isLazy: false; editor: Editor<T>; initValue: T }
): Editor<ReadonlyArray<T>> => (props) => {
  if (props.value.length === 0) {
    return h(
      StyledListEditor,
      {},
      h(AddButton, {
        onClick: () => props.onChange([param.initValue]),
      })
    );
  }
  const itemEditorComponent = param.isLazy ? param.editor() : param.editor;
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
    h(AddButton, {
      onClick: () => props.onChange([...props.value, param.initValue]),
    })
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

const AddButton: FunctionComponent<{ onClick: () => void }> = (props) =>
  h(
    Button,
    {
      onClick: props.onClick,
      key: "add",
    },
    "+"
  );

const DeleteButton = styled(Button)({
  width: 32,
});
