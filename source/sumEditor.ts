import {
  ChangeEvent,
  FunctionComponent,
  ReactElement,
  createElement as h,
} from "react";
import { Editor, styledDiv } from "./ui";
import styled from "styled-components";

export const SumEditor = <T extends Record<string, unknown>>(
  parameterComponentObject: {
    [key in keyof T]?: Editor<T[key]>;
  },
  defaultValueObject: {
    [key in keyof T]: keyof T | { _: keyof T };
  }
): Editor<keyof T | { _: keyof T }> => (props): ReactElement => {
  return h("div", {}, [
    h(SumTagRadio, {
      key: "tag",
      name: props.name,
      tagNameList: Object.keys(defaultValueObject),
      onChange: (newTagName: string) => {
        const defaultValue = defaultValueObject[newTagName];
        if (defaultValue === undefined) {
          throw new Error("デフォルト値が不明! tagName=" + newTagName);
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

const SumTagRadio: FunctionComponent<{
  tagNameList: ReadonlyArray<string>;
  value: string;
  name: string;
  onChange: (newValue: string) => void;
}> = (props) => {
  return h(
    StyledTagSumRadio,
    {},
    props.tagNameList.map((tagName, index) =>
      inputAndLabel(
        props.name + "-" + tagName,
        tagName,
        index,
        props.value === tagName,
        props.onChange
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
  ySameCellCount: 3,
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
