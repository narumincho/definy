import {
  ChangeEvent,
  FunctionComponent,
  ReactElement,
  createElement as h,
} from "react";
import { Editor, styledDiv } from "./ui";
import styled from "styled-components";

export const createWithParameterSumEditor = <
  T extends { [k in string]: unknown }
>(
  parameterComponentObject: {
    [key in keyof T]: Editor<T[key]> | undefined;
  },
  defaultValueObject: {
    [key in keyof T]: { _: keyof T };
  }
): Editor<{ _: keyof T }> => {
  const TagEditor = createNoParameterTagEditor(
    Object.keys(defaultValueObject)
  ) as Editor<keyof T>;
  return (props): ReactElement => {
    return h("div", {}, [
      h(TagEditor, {
        key: "tag",
        name: props.name,
        onChange: (newTagName: keyof T) => {
          const defaultValue = defaultValueObject[newTagName];
          if (defaultValue === undefined) {
            throw new Error(
              "デフォルト値が不明! tagName=" + newTagName.toString()
            );
          }
          props.onChange(defaultValue);
        },
        value:
          typeof props.value === "string"
            ? props.value
            : (props.value as { _: string })._,
      }),
      h(SumParameterEditor, {
        key: "paramter",
        value:
          typeof props.value === "string"
            ? props.value
            : (props.value as { _: string })._,
      }),
    ]);
  };
};

export const createNoParameterTagEditor = <tag extends string>(
  tagNameList: ReadonlyArray<tag>
): Editor<tag> => (props) => {
  return h(
    StyledTagSumRadio,
    {},
    tagNameList.map((tagName, index) =>
      inputAndLabel(
        props.name + "-" + tagName,
        tagName,
        index,
        props.value === tagName,
        (newValue: string) => {
          if (!tagNameList.includes(newValue as tag)) {
            throw new Error("not include newValue =" + newValue);
          }
          props.onChange(newValue as tag);
        }
      )
    )
  );
};

const inputAndLabel = (
  name: string,
  tagName: string,
  index: number,
  isChecked: boolean,
  onChange: (value: string) => void
) => [
  h(StyledInput, {
    key: tagName + "-input",
    type: "radio",
    value: tagName,
    name,
    id: name,
    checked: isChecked,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
  }),
  h(
    StyledLabel,
    {
      key: tagName + "-label",
      htmlFor: name,
      isChecked,
      index,
    },
    tagName
  ),
];

const StyledInput = styled.input({
  width: 0,
  height: 0,
});

const StyledTagSumRadio = styledDiv({
  borderRadius: 8,
  border: { width: 1, color: "#333" },
  padding: 0,
  direction: "x",
  xGridTemplate: [{ _: "OneFr" }, { _: "OneFr" }, { _: "OneFr" }],
});

const StyledLabel = styled.label(
  (props: { isChecked: boolean; index: number }) =>
    ({
      backgroundColor: props.isChecked ? "#aaa" : "#000",
      color: props.isChecked ? "#000" : "#ddd",
      padding: 4,
      cursor: "pointer",
      display: "block",
      gridColumn:
        (props.index + 1).toString() + " / " + (props.index + 2).toString(),
      gridRow: "1 / 2",
      textAlign: "center",
    } as const)
);

const SumParameterEditor: FunctionComponent<{ value: string }> = (props) => {
  return h("div", {}, props.value + "のエディタ");
};
