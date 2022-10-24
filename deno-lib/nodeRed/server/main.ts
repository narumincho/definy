import type { NodeAPI, NodeDef, Node } from "./nodeRedServer.ts";
import type {
  IncomingMessage,
  ServerResponse,
} from "https://deno.land/std@0.160.0/node/http.ts";

/**
 * Node RED の HTTP サーバーの処理に入り込んで, エディタとの通信をする
 */
const handleRequest = (
  request: IncomingMessage,
  response: ServerResponse
): void => {
  let requestBody = new Uint8Array();
  if (request.url !== "/definy") {
    return;
  }
  request.on("data", (chunk) => {
    requestBody = new Uint8Array([...requestBody, ...chunk]);
  });
  request.on("end", async () => {
    const requestBodyAsString = new TextDecoder().decode(requestBody);
    console.log(requestBodyAsString);
    const requestJson = JSON.parse(requestBodyAsString);
    const originUrl: unknown = requestJson.originUrl;

    if (typeof originUrl !== "string") {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify("need originUrl"));
      return;
    }

    // await のあとに返すとエラーになってしまう
    response.writeHead(200, { "Content-Type": "application/json" });

    const connectionResult = await fetch(originUrl).then(
      () => {
        console.log("接続チェック完了ok!");
        return true;
      },
      (e) => {
        console.log("接続チェック完了 だめっぽい", e);
        return false;
      }
    );

    console.log("connectionResult", connectionResult);

    console.log("send 200");
    response.end(
      JSON.stringify({
        connectionResult,
      })
    );
  });
};

// Node.js 内で動作
export default function (RED: NodeAPI) {
  RED.server.addListener("request", handleRequest);

  // eslint-disable-next-line func-style
  function CustomNode(this: Node, config: NodeDef): void {
    RED.nodes.createNode(this, config);
  }

  // eslint-disable-next-line func-style
  function SendToDefiny(
    this: Node,
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
          fetch(nodeInstance.originUrl).then(
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
}
