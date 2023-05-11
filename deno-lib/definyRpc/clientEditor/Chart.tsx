import React from "https://esm.sh/react@18.2.0?pin=v119";
import {
  Edge,
  Network,
  Node,
} from "https://cdn.skypack.dev/vis-network@9.1.2?dts";
import { DefinyRpcTypeInfo, Namespace, Type } from "../core/coreType.ts";
import {
  fromFunctionNamespace,
  namespaceToString,
} from "../codeGen/namespace.ts";
import { FunctionAndTypeList } from "./Editor.tsx";

export const SampleChart = (
  props: { readonly functionAndTypeList: FunctionAndTypeList },
) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const container = ref.current;
    if (container === null) {
      return;
    }

    const graph2d = new Network(
      container,
      {
        nodes: [
          ...props.functionAndTypeList.typeList.map((type): Node => ({
            id: namespaceAndNameToId(type.namespace, type.name),
            label: namespaceAndNameToId(type.namespace, type.name),
          })),
          ...props.functionAndTypeList.funcList.map((func): Node => ({
            id: namespaceAndNameToId(
              fromFunctionNamespace(func.namespace),
              func.name,
            ),
            label: namespaceAndNameToId(
              fromFunctionNamespace(func.namespace),
              func.name,
            ),
            color: "orange",
          })),
        ],
        edges: [
          ...props.functionAndTypeList.typeList.flatMap(typeInfoToEdge),
          ...props.functionAndTypeList.funcList.flatMap((
            func,
          ): ReadonlyArray<Edge> => [
            ...typeToEdgeList({
              id: namespaceAndNameToId(
                fromFunctionNamespace(func.namespace),
                func.name,
              ) + "-input",
              to: namespaceAndNameToId(
                fromFunctionNamespace(func.namespace),
                func.name,
              ),
              label: "input",
              type: func.input,
            }),
            ...typeToEdgeList({
              id: namespaceAndNameToId(
                fromFunctionNamespace(func.namespace),
                func.name,
              ) + "-output",
              to: namespaceAndNameToId(
                fromFunctionNamespace(func.namespace),
                func.name,
              ),
              label: "output",
              type: func.output,
            }),
          ]),
        ],
      },
      { width: "512", height: "512" },
    );
    console.log(graph2d);
  }, [ref.current, props.functionAndTypeList]);

  return <div ref={ref}></div>;
};

const typeInfoToEdge = (typeInfo: DefinyRpcTypeInfo): ReadonlyArray<Edge> => {
  const toTypeId = namespaceAndNameToId(
    typeInfo.namespace,
    typeInfo.name,
  );
  switch (typeInfo.body.type) {
    case "product":
      return typeInfo.body.value.flatMap((field): ReadonlyArray<Edge> =>
        typeToEdgeList({
          id: toTypeId + "-product-" + field.name,
          to: toTypeId,
          label: field.name,
          type: field.type,
        })
      );
    case "sum":
      return typeInfo.body.value.flatMap((
        pattern,
      ): ReadonlyArray<
        Edge
      > => (pattern.parameter.type === "nothing" ? [] : typeToEdgeList({
        id: toTypeId + "-sum-" + pattern.name,
        to: toTypeId,
        label: pattern.name,
        type: pattern.parameter.value,
      })));
  }
  return [];
};

const typeToEdgeList = <t extends unknown>(parameter: {
  readonly id: string;
  readonly to: string;
  readonly label: string;
  readonly type: Type<t>;
}): ReadonlyArray<Edge> => {
  return [
    {
      id: parameter.id,
      arrows: "to",
      from: namespaceAndNameToId(
        parameter.type.namespace,
        parameter.type.name,
      ),
      to: parameter.to,
      label: parameter.label,
    },
    ...parameter.type.parameters.map((param, index): Edge => ({
      id: parameter.id + "-" + index,
      arrows: "to",
      from: namespaceAndNameToId(
        param.namespace,
        param.name,
      ),
      to: parameter.to,
      label: parameter.label + "[" + index + "]",
    })),
  ];
};

const namespaceAndNameToId = (
  typeNamespace: Namespace,
  typeName: string,
): string => {
  return namespaceToString(typeNamespace) + "." + typeName;
};
