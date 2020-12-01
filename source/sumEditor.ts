import { ChangeEvent, ReactElement } from "react";
import {
  Editor,
  EditorProps,
  div,
  editorToReactElement,
  simpleStyleToCss,
} from "./ui";
import { css, jsx as h } from "@emotion/react";

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
  const TagEditor = createNoParameterTagEditor<Tag>(
    Object.keys(defaultValueObject) as Array<Tag>
  );
  const editor = (props: EditorProps<T>): ReactElement => {
    const parameterComponent = parameterComponentObject[
      props.value._
    ] as Editor<unknown>;

    const parameterNameAndValue = getParameterFieldNameAndValue<unknown>(
      props.value as {
        _: string;
      } & Record<string, unknown>
    );

    return div(css(), [
      editorToReactElement<Tag>(TagEditor, {
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
        model: props.model,
      }),
      parameterNameAndValue === undefined
        ? undefined
        : editorToReactElement<unknown>(parameterComponent, {
            key: "paramter",
            value: parameterNameAndValue.value,
            name: "name",
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

export const createNoParameterTagEditor = <tag extends string>(
  tagNameList: ReadonlyArray<tag>
): Editor<tag> => (props) => {
  return h(
    "div",
    {
      css: simpleStyleToCss({
        borderRadius: 8,
        border: { width: 1, color: "#333" },
        padding: 0,
        direction: "x",
        xGridTemplate: [{ _: "OneFr" }, { _: "OneFr" }, { _: "OneFr" }],
      }),
    },
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
): ReadonlyArray<ReactElement> => [
  h("input", {
    key: tagName + "-input",
    type: "radio",
    value: tagName,
    name,
    id: name,
    checked: isChecked,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    css: css({
      width: 0,
      height: 0,
    }),
  }),
  h(
    "label",
    {
      key: tagName + "-label",
      htmlFor: name,
      css: css({
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
      }),
    },
    tagName
  ),
];
