import { ChangeEvent, ReactElement, createElement as h } from "react";
import { Editor, editorToReactElement, styledDiv } from "./ui";
import styled from "styled-components";

export const createWithParameterSumEditor = <
  Tag extends string,
  T extends { _: Tag } & Record<string, unknown>,
  Value extends { [k in Tag]: unknown }
>(
  parameterComponentObject: {
    [key in Tag]: Editor<unknown> | undefined;
  },
  defaultValueObject: {
    [key in Tag]: T;
  }
): Editor<T> => {
  const TagEditor = createNoParameterTagEditor<Tag>(
    Object.keys(defaultValueObject) as Array<Tag>
  );
  return (props): ReactElement => {
    const parameterComponent = parameterComponentObject[props.value._] as
      | Editor<Value[Tag]>
      | undefined;

    const parameterNameAndValue = getParameterFieldNameAndValue<Value[Tag]>(
      props.value as {
        _: string;
      } & Record<string, Value[Tag]>
    );

    return h("div", {}, [
      h(TagEditor, {
        key: "tag",
        name: props.name,
        onChange: (newTagName: Tag) => {
          const defaultValue = defaultValueObject[newTagName];
          if (defaultValue === undefined) {
            throw new Error(
              "デフォルト値が不明! tagName=" + newTagName.toString()
            );
          }
          props.onChange(defaultValue);
        },
        value: props.value._,
      }),
      parameterComponent === undefined || parameterNameAndValue === undefined
        ? undefined
        : editorToReactElement<Value[Tag]>(parameterComponent, {
            key: "paramter",
            value: parameterNameAndValue.value,
            name: "name",
            onChange: (newValue: Value[Tag]): void => {
              props.onChange(({
                _: props.value._,
                [parameterNameAndValue.name]: newValue,
              } as unknown) as T);
            },
          }),
    ]);
  };
};

const getParameterFieldNameAndValue = <valueType>(
  sumValue: { _: string } & Record<string, valueType>
): { name: string; value: valueType } | undefined => {
  const keys = Object.entries(sumValue);
  for (const [key, value] of keys) {
    if (key !== "_") {
      return { name: key, value };
    }
  }
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
