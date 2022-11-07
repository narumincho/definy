import React from "https://esm.sh/react@18.2.0";
import { Network } from "https://esm.sh/vis-network@9.1.2";

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
          {
            id: "j",
            label: "少し長めのラベル名も行けるかな...?",
            shape: "circle",
          },
        ],
        edges: [{ id: "edgeId", arrows: "to", from: "aId", to: "bId" }],
      },
      { width: "200", height: "200" }
    );
    console.log(graph2d);
  }, [ref.current]);

  return <div ref={ref}></div>;
};
