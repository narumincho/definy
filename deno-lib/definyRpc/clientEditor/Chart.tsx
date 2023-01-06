import React from "https://esm.sh/react@18.2.0?pin=v102";
import { Network } from "https://cdn.skypack.dev/vis-network@9.1.2?dts";
import { DefinyRpcTypeInfo } from "../core/coreType.ts";
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

    const graph2d = new Network(
      container,
      {
        nodes: props.typeList.map((type) => ({
          id: type.name,
          label: namespaceToString(type.namespace) + "." + type.name,
        })),
        edges: props.typeList.flatMap((type) => {
          switch (type.body.type) {
            case "product":
              return type.body.value.map((field, index) => ({
                id: type.name + index,
                arrows: "to",
                from: field.type.name,
                to: type.name,
              }));
            case "sum":
              return type.body.value.flatMap((
                pattern,
                index,
              ) => (pattern.parameter.type === "nothing" ? [] : [{
                id: type.name + index,
                arrows: "to",
                from: pattern.parameter.value,
                to: type.name,
              }]));
          }
          return [];
        }),
        // edges: [{ id: "edgeId", arrows: "to", from: "aId", to: "bId" }],
      },
      { width: "512", height: "512" },
    );
    console.log(graph2d);
  }, [ref.current]);

  return <div ref={ref}></div>;
};
