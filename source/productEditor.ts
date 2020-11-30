import { Editor, EditorProps, editorToReactElement, styledDiv } from "./ui";
import { ReactElement, createElement as h } from "react";
import styled from "styled-components";

export const createProductEditor = <T extends Record<string, unknown>>(
  memberComponentObject: {
    [key in keyof T]: Editor<T[key]>;
  },
  displayName: string
): Editor<T> => {
  const editor = (props: EditorProps<T>): ReactElement => {
    return h(
      StyledProductEditor,
      {},
      Object.entries(memberComponentObject).map(([key, component]) => [
        h(StyledLabel, { key }, key),
        editorToReactElement(component, {
          name: props.name + "-" + key,
          key,
          value: props.value[key],
          onChange: (newValue) => {
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

const StyledProductEditor = styledDiv({
  direction: "y",
  padding: 0,
});

const StyledLabel = styled.label`
  display: grid;
  padding: 8px;
`;
