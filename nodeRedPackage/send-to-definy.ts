import { Node, NodeAPI, NodeDef } from "node-red";
import { request } from "undici";

// Node.js 内で動作
module.exports = (RED: NodeAPI) => {
  // eslint-disable-next-line func-style
  function SendToDefiny(
    this: Node<Record<string, unknown>>,
    config: NodeDef
  ): void {
    RED.nodes.createNode(this, config);
    this.on("input", (msg) => {
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
};
