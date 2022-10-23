import { Node, NodeAPI, NodeDef } from "node-red";
import { request as undiciRequest } from "undici";

// Node.js 内で動作
module.exports = (RED: NodeAPI) => {
  RED.server.addListener("request", (request, response) => {
    if (request.url !== "/definy") {
      return;
    }

    request.on("data", (chunk) => {
      console.log("チャンク到達", chunk);
    });
    request.on("end", (e: unknown) => {
      console.log("end到達", e);
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("Node.js からのメッセージだ!");
    });
    console.log("message.url", request.url);
  });

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
    config: NodeDef & { originUrl: string }
  ): void {
    RED.nodes.createNode(this, config);
  }
  RED.nodes.registerType("send-to-definy", SendToDefiny);

  setInterval(() => {
    RED.nodes.eachNode((node) => {
      if (node.type === "send-to-definy") {
        const nodeInstance = RED.nodes.getNode(node.id) as Node & {
          originUrl: string;
        };

        nodeInstance
          .context()
          .global.set(
            "definy-set-by-node-js",
            "in Node.js " + new Date().toISOString()
          );

        if (typeof nodeInstance.originUrl === "string") {
          undiciRequest(nodeInstance.originUrl).then(
            () => {
              nodeInstance.status({
                fill: "green",
                shape: "ring",
                text:
                  nodeInstance.originUrl +
                  " HTTP サーバーとして接続できたっぽいよ ",
              });
            },
            (e) => {
              nodeInstance.status({
                fill: "red",
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                text: nodeInstance.originUrl + " " + e.toString(),
              });
            }
          );
        }
      }
    });
  }, 3000);
};
