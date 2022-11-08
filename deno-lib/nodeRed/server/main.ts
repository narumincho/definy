import type { NodeAPI, NodeDef, Node } from "./nodeRedServer.ts";

// Node.js 内で動作
export default function (RED: NodeAPI) {
  // eslint-disable-next-line func-style
  function CustomNode(this: Node, config: NodeDef): void {
    RED.nodes.createNode(this, config);
  }

  // eslint-disable-next-line func-style
  function CreateDefinyRpcNode(
    this: Node,
    config: NodeDef & { url: string }
  ): void {
    RED.nodes.registerType("definy-dynamic", CustomNode);
    RED.nodes.createNode(this, config);
    console.log(this);
    this.status({
      shape: "dot",
      fill: "green",
      text: JSON.stringify({
        node: [{ name: "a" }, { name: "b" }, { name: "c" }],
      }),
    });
  }
  RED.nodes.registerType("create-definy-rpc-node", CreateDefinyRpcNode);
}
