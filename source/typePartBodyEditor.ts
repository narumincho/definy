import * as d from "definy-core/source/data";
import { ChangeEvent, FunctionComponent, createElement as h } from "react";
import styled from "styled-components";

/**
 * 型の本体のエディタ
 */
export const TypePartBodyEditor: FunctionComponent<{
  name: string;
  typePartBody: d.TypePartBody;
  onChange: (typePartBody: d.TypePartBody) => void;
}> = (props) =>
  h(StyledTypePartBodyEditor, {}, [
    h(StyledInput, {
      key: "sum-input",
      type: "radio",
      value: "sum",
      name: props.name,
      id: props.name + "-sum",
      checked: props.typePartBody._ === "Sum",
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        props.onChange(valueToTypePartBody(event.target.value));
      },
    }),
    h(
      StyledLabel,
      {
        key: "sum-label",
        htmlFor: props.name + "-sum",
        isChecked: props.typePartBody._ === "Sum",
        index: 0,
      },
      "Sum"
    ),
    h(StyledInput, {
      key: "product-input",
      type: "radio",
      value: "product",
      name: props.name,
      id: props.name + "-product",
      checked: props.typePartBody._ === "Product",
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        props.onChange(valueToTypePartBody(event.target.value));
      },
    }),
    h(
      StyledLabel,
      {
        key: "product-label",
        htmlFor: props.name + "-product",
        isChecked: props.typePartBody._ === "Product",
        index: 1,
      },
      "Product"
    ),
    h(StyledInput, {
      key: "kernel-input",
      type: "radio",
      value: "kernel",
      name: props.name,
      id: props.name + "-kernel",
      checked: props.typePartBody._ === "Kernel",
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        props.onChange(valueToTypePartBody(event.target.value));
      },
    }),
    h(
      StyledLabel,
      {
        key: "kernel-label",
        htmlFor: props.name + "-kernel",
        isChecked: props.typePartBody._ === "Kernel",
        index: 2,
      },
      "Kernel"
    ),
  ]);

const valueToTypePartBody = (value: string): d.TypePartBody => {
  switch (value) {
    case "sum":
      return d.TypePartBody.Sum([]);
    case "product":
      return d.TypePartBody.Product([]);
    case "kernel":
      return d.TypePartBody.Kernel(d.TypePartBodyKernel.String);
  }
  throw new Error(
    "ui error. invalid type part body radio value. value = " +
      JSON.stringify(value)
  );
};

const StyledTypePartBodyEditor = styled.div({
  padding: 8,
  borderRadius: 8,
  border: "solid 1px #333",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
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

const StyledInput = styled.input({
  width: 0,
  height: 0,
});
