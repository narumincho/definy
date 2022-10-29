import type { NodeAPI, NodeDef, Node } from "./nodeRedServer.ts";
import type {
  IncomingMessage,
  ServerResponse,
} from "https://deno.land/std@0.161.0/node/http.ts";
import { definyRpc } from "../../definyRpc/server/mod.ts";

/**
 * Node RED の HTTP サーバーの処理に入り込んで, エディタとの通信をする
 */
const handleRequest = (
  incomingMessage: IncomingMessage,
  response: ServerResponse
): void => {
  const simpleRequest =
    definyRpc.incomingMessageToSimpleRequest(incomingMessage);
  if (simpleRequest === undefined) {
    console.log("definy RPC が処理できない Request が来たようだ");
    return;
  }
  const simpleResponse = definyRpc.handleRequest(
    {
      all: () => [
        definyRpc.createApiFunction({
          fullName: ["sampleFunc"],
          description: "sample func",
          input: definyRpc.unit,
          output: definyRpc.string,
          isMutation: false,
          needAuthentication: false,
          resolve: () => {
            return Promise.resolve("");
          },
        }),
      ],
      codeGenOutputFolderPath: undefined,
      name: "definyRpcInNodeRed",
      originHint: "http://localhost:5000",
      pathPrefix: ["definy"],
    },
    simpleRequest
  );
  if (simpleResponse === undefined) {
    return;
  }
  console.log(simpleRequest, simpleResponse);
  definyRpc.simpleResponseHandleServerResponse(simpleResponse, response);
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

  RED.nodes.registerType("definy-dynamic-node", function DynamicNode(config) {
    console.log("definy-dynamic-node!");
    RED.nodes.createNode(this, config);
  });

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
