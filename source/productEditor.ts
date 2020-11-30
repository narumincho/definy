import { Editor, EditorProps, styledDiv } from "./ui";
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
        memberComponent(
          props.name + "-" + key,
          key,
          props.value[key],
          component,
          (newValue) => {
            props.onChange({ ...props.value, [key]: newValue });
          }
        ),
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

const memberComponent = <T extends unknown>(
  name: string,
  key: string,
  member: T,
  component: Editor<T>,
  onChange: (newMemberValue: T) => void
) =>
  h(component, {
    value: member,
    onChange,
    key: key + "-input",
    name,
  });
