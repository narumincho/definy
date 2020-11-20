import * as d from "definy-core/source/data";
import { ChangeEvent, FunctionComponent, createElement as h } from "react";
import { Button } from "./button";
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
    h(TypePartBodyPatternEditor, {
      key: "pattern",
      pattern: props.typePartBody._,
      name: props.name + "-pattern",
      onChange: (pattern) => {
        switch (pattern) {
          case "Sum":
            props.onChange(d.TypePartBody.Sum([]));
            return;
          case "Product":
            props.onChange(d.TypePartBody.Product([]));
            return;
          case "Kernel":
            props.onChange(d.TypePartBody.Kernel(d.TypePartBodyKernel.String));
        }
      },
    }),
    h(TypePartBodyParameterEditor, {
      key: "parameter",
      name: props.name + "-param",
      typePartBody: props.typePartBody,
      onChange: props.onChange,
    }),
  ]);

const StyledTypePartBodyEditor = styled.div({
  display: "grid",
});

type TypePartBodyPattern = "Sum" | "Product" | "Kernel";

const TypePartBodyPatternEditor: FunctionComponent<{
  pattern: TypePartBodyPattern;
  name: string;
  onChange: (pattern: TypePartBodyPattern) => void;
}> = (props) =>
  h(StyledTypePartBodyPatternEditor, {}, [
    h(StyledInput, {
      key: "sum-input",
      type: "radio",
      value: "sum",
      name: props.name,
      id: props.name + "-sum",
      checked: props.pattern === "Sum",
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        props.onChange(valueToTypePartBodyPattern(event.target.value));
      },
    }),
    h(
      StyledLabel,
      {
        key: "sum-label",
        htmlFor: props.name + "-sum",
        isChecked: props.pattern === "Sum",
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
      checked: props.pattern === "Product",
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        props.onChange(valueToTypePartBodyPattern(event.target.value));
      },
    }),
    h(
      StyledLabel,
      {
        key: "product-label",
        htmlFor: props.name + "-product",
        isChecked: props.pattern === "Product",
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
      checked: props.pattern === "Kernel",
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        props.onChange(valueToTypePartBodyPattern(event.target.value));
      },
    }),
    h(
      StyledLabel,
      {
        key: "kernel-label",
        htmlFor: props.name + "-kernel",
        isChecked: props.pattern === "Kernel",
        index: 2,
      },
      "Kernel"
    ),
  ]);

const valueToTypePartBodyPattern = (value: string): TypePartBodyPattern => {
  switch (value) {
    case "sum":
      return "Sum";
    case "product":
      return "Product";
    case "kernel":
      return "Kernel";
  }
  throw new Error(
    "ui error. invalid type part body radio value. value = " +
      JSON.stringify(value)
  );
};

const StyledTypePartBodyPatternEditor = styled.div({
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

const TypePartBodyParameterEditor: FunctionComponent<{
  name: string;
  typePartBody: d.TypePartBody;
  onChange: (typePartBody: d.TypePartBody) => void;
}> = (props) => {
  switch (props.typePartBody._) {
    case "Sum":
      return h(PatternListEditor, {
        patternList: props.typePartBody.patternList,
        onChange: (patternList) => {
          props.onChange(d.TypePartBody.Sum(patternList));
        },
      });
    case "Product":
      return h(MemberListEditor, { memberList: props.typePartBody.memberList });
    case "Kernel":
      return h(TypePartBodyKernelEditor, {
        typePartBodyKernel: props.typePartBody.typePartBodyKernel,
      });
  }
};

const PatternListEditor: FunctionComponent<{
  patternList: ReadonlyArray<d.Pattern>;
  onChange: (patternList: ReadonlyArray<d.Pattern>) => void;
}> = (props) =>
  h(
    StyledPatternListEditor,
    {},
    props.patternList.map((_, index) => h(PatternEditor, { key: index })),
    h(
      Button,
      {
        key: "add",
        onClick: () => {
          props.onChange(
            props.patternList.concat({
              name: "SampleTagName",
              description: "SampleTagDescription",
              parameter: d.Maybe.Nothing<d.Type>(),
            })
          );
        },
      },
      "+"
    )
  );

const PatternEditor: FunctionComponent<{}> = () => h("div", {}, "パターン");

const StyledPatternListEditor = styled.div({
  display: "grid",
});

const MemberListEditor: FunctionComponent<{
  memberList: ReadonlyArray<d.Member>;
}> = (props) => h("div", {}, "メンバーリストエディタ");

const TypePartBodyKernelEditor: FunctionComponent<{
  typePartBodyKernel: d.TypePartBodyKernel;
}> = (props) =>
  h(
    "div",
    {},
    "TypePartBodyKernel エディタ value =" + props.typePartBodyKernel
  );
