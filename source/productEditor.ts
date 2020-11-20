import { Editor, styledDiv } from "./ui";
import { ReactElement, createElement as h } from "react";

export const ProductEditor = <T extends Record<string, unknown>>(
  memberComponentObject: {
    [key in keyof T]: Editor<T[key]>;
  }
): Editor<T> => (props): ReactElement => {
  return h(
    StyledProductEditor,
    {},
    "ProductEditor!",
    Object.entries(memberComponentObject).map(([key, component]) =>
      h("label", { key }, [
        key,
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
    )
  );
};

const StyledProductEditor = styledDiv({
  direction: "y",
  padding: 8,
});

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
