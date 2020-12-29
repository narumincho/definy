import { Editor, EditorProps, box, editorToReactElement } from "./ui";
import { c, inputRadio, label } from "./view/viewUtil";
import { Element } from "./view/view";
import { ReactElement } from "react";
import { jsx as h } from "@emotion/react";

export const createWithParameterSumEditor = <
  ParamType extends { [key in string]: unknown },
  Tag extends string & keyof ParamType,
  T extends { _: Tag } & Record<string, unknown>
>(
  parameterComponentObject: {
    [key in keyof ParamType]: Editor<ParamType[key]>;
  },
  defaultValueObject: {
    [key in keyof ParamType]: T;
  },
  name: string
): Editor<T> => {
  const TagEditor = "div";
  const editor = (props: EditorProps<T>): ReactElement => {
    const parameterComponent = parameterComponentObject[
      props.value._
    ] as Editor<unknown>;

    const parameterNameAndValue = getParameterFieldNameAndValue<unknown>(
      props.value as {
        _: string;
      } & Record<string, unknown>
    );

    return h("div", {}, [
      h(TagEditor, {
        key: "tag",
        name: props.name + "-tag",
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
        model: props.model,
      }),
      parameterNameAndValue === undefined
        ? undefined
        : editorToReactElement<unknown>(parameterComponent, {
            key: "paramter",
            value: parameterNameAndValue.value,
            name: props.name + "-value",
            onChange: (newValue: unknown): void => {
              props.onChange(({
                _: props.value._,
                [parameterNameAndValue.name]: newValue,
              } as unknown) as T);
            },
            model: props.model,
          }),
    ]);
  };
  editor.displayName = name;
  return editor;
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

const tagEditor = (
  tagList: ReadonlyArray<string>,
  selectedTag: string,
  groupName: string
) =>
  box(
    {
      borderRadius: 8,
      border: { width: 1, color: "#333" },
      padding: 0,
      direction: "x",
      xGridTemplate: [{ _: "OneFr" }, { _: "OneFr" }, { _: "OneFr" }],
    },
    c(
      tagList.flatMap((tagName, index) =>
        inputAndLabel(groupName, tagName, index, selectedTag === tagName)
      )
    )
  );

const inputAndLabel = (
  name: string,
  tagName: string,
  index: number,
  isChecked: boolean
): ReadonlyArray<readonly [string, Element<string>]> => [
  [
    tagName + "-input",
    inputRadio({
      id: name + "-" + tagName,
      groupName: name,
      checked: isChecked,
      select: tagName,
      style: {
        width: 0,
        height: 0,
      },
    }),
  ],
  [
    tagName + "-label",
    label(
      {
        targetElementId: name + "-" + tagName,
        style: {
          backgroundColor: isChecked ? "#aaa" : "#000",
          color: isChecked ? "#000" : "#ddd",
          padding: 4,
          cursor: "pointer",
          display: "block",
          gridColumn:
            ((index % 3) + 1).toString() + " / " + ((index % 3) + 2).toString(),
          gridRow:
            (Math.floor(index / 3) + 1).toString() +
            " / " +
            (Math.floor(index / 3) + 2).toString(),
          textAlign: "center",
          "&:active": {
            backgroundColor: "#303030",
          },
        },
      },
      tagName
    ),
  ],
];
