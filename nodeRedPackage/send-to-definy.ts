import { Node, NodeAPI, NodeDef } from "node-red";
import { request } from "undici";

// Node.js 内で動作
module.exports = (RED: NodeAPI) => {
  // eslint-disable-next-line func-style
  function CustomNode(
    this: Node<Record<string, unknown>>,
    config: NodeDef
  ): void {
    RED.nodes.createNode(this, config);
  }

  // eslint-disable-next-line func-style
  function SendToDefiny(
    this: Node<Record<string, unknown>>,
    config: NodeDef & { custom: string }
  ): void {
    // browser to node.js
    RED.nodes.createNode(this, config);
    config.custom = config.custom.repeat(2);

    console.log("init SendToDefiny", config);
    this.on("input", (msg) => {
      console.log(this);
      RED.nodes.registerType("definy-custom-" + config.custom, CustomNode);
      request("https://narumincho.com")
        .then((response) => {
          return response.body.text();
        })
        .then((html) => {
          const payload = (msg.payload as string).toLowerCase();
          this.send({ payload: html });
        });
    });
  }
  RED.nodes.registerType("send-to-definy", SendToDefiny);

  setInterval(() => {
    RED.nodes.eachNode((node) => {
      if (node.type === "send-to-definy") {
        // console.log("send-to-definy のノードを見つけた", node);
        const nodeInstance = RED.nodes.getNode(node.id);

        nodeInstance.status({
          text:
            (nodeInstance.name ?? "不明な名前") +
            " " +
            new Date().toISOString(),
        });
      }
    });
  }, 3000);
};
