import React from "https://esm.sh/react@18.2.0?pin=v102";
import {
  Edge,
  Network,
  Node,
} from "https://cdn.skypack.dev/vis-network@9.1.2?dts";
import { DefinyRpcTypeInfo, Namespace } from "../core/coreType.ts";
import { namespaceToString } from "../codeGen/namespace.ts";

export const SampleChart = (
  props: { readonly typeList: ReadonlyArray<DefinyRpcTypeInfo> },
) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const container = ref.current;
    if (container === null) {
      return;
    }

    console.log("net", {
      nodes: props.typeList.map((type): Node => ({
        id: typeToId(type.namespace, type.name),
        label: namespaceToString(type.namespace) + "." + type.name,
      })),
      edges: props.typeList.flatMap(typeInfoToEdge),
    });

    const graph2d = new Network(
      container,
      {
        nodes: props.typeList.map((type): Node => ({
          id: typeToId(type.namespace, type.name),
          label: namespaceToString(type.namespace) + "." + type.name,
        })),
        edges: props.typeList.flatMap(typeInfoToEdge),
      },
      { width: "512", height: "512" },
    );
    console.log(graph2d);
  }, [ref.current, props.typeList]);

  return <div ref={ref}></div>;
};

const typeInfoToEdge = (typeInfo: DefinyRpcTypeInfo): ReadonlyArray<Edge> => {
  const toTypeId = typeToId(
    typeInfo.namespace,
    typeInfo.name,
  );
  switch (typeInfo.body.type) {
    case "product":
      return typeInfo.body.value.flatMap((field): ReadonlyArray<Edge> => [
        {
          id: typeInfo.name + "SEPARATE" + field.name,
          arrows: "to",
          from: typeToId(
            field.type.namespace,
            field.type.name,
          ),
          to: toTypeId,
          label: field.name,
        },
        ...field.type.parameters.map((parameter, index): Edge => ({
          id: typeInfo.name + "SEPARATE" + field.name + index,
          arrows: "to",
          from: typeToId(
            parameter.namespace,
            parameter.name,
          ),
          to: toTypeId,
          label: field.name,
        })),
      ]);
    case "sum":
      return typeInfo.body.value.flatMap((
        pattern,
      ): ReadonlyArray<Edge> => (pattern.parameter.type === "nothing" ? [] : [
        {
          id: typeInfo.name + "SEPARATE" + pattern.name,
          arrows: "to",
          from: typeToId(
            pattern.parameter.value.namespace,
            pattern.parameter.value.name,
          ),
          to: toTypeId,
          label: pattern.name,
        },
        ...(pattern.parameter.value.parameters.map(
          (parameter, index): Edge => ({
            id: typeInfo.name + "SEPARATE" + pattern.name + index,
            arrows: "to",
            from: typeToId(
              parameter.namespace,
              parameter.name,
            ),
            to: toTypeId,
            label: pattern.name,
          }),
        )),
      ]));
  }
  return [];
};

const typeToId = (typeNamespace: Namespace, typeName: string): string => {
  return namespaceToString(typeNamespace) + "." + typeName;
};
