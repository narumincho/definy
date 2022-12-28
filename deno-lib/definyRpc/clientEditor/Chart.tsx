import React from "https://esm.sh/react@18.2.0?pin=v102";
import { Network } from "https://cdn.skypack.dev/vis-network@9.1.2?dts";

export const SampleChart = () => {
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
          { id: "aId", label: "a", shape: "circle" },
          { id: "bId", label: "b", shape: "circle" },
        ],
        edges: [{ id: "edgeId", arrows: "to", from: "aId", to: "bId" }],
      },
      { width: "200", height: "200" },
    );
    console.log(graph2d);
  }, [ref.current]);

  return <div ref={ref}></div>;
};
