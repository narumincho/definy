import { urlFromString } from "../client/urlFromString.ts";
import type { Node, NodeAPI, NodeDef } from "./nodeRedServer.ts";
import type { Status } from "./status.ts";
import * as definyRpcClient from "../../definyRpc/client/generated/definyRpc.ts";
import { jsonStringify } from "../../typedJson.ts";

const createdServer = new Set<string>();

// Node.js 内で動作
export default function (RED: NodeAPI) {
  const generateNode = (
    parameter: {
      readonly url: URL;
      readonly functionDetail: definyRpcClient.FunctionDetail;
    },
  ) => {
    // eslint-disable-next-line func-style
    return function (this: Node, config: NodeDef): void {
      RED.nodes.createNode(this, config);
      this.on("input", (_msg, send) => {
        const apiUrl = new URL(parameter.url);
        apiUrl.pathname = apiUrl.pathname + "/" +
          parameter.functionDetail.name.join("/");
        fetch(apiUrl).then((response) => response.json()).then((json) => {
          send({ payload: json });
        });
      });
    };
  };

  // eslint-disable-next-line func-style
  function CreateDefinyRpcNode(
    this: Node,
    config: NodeDef & { url: string },
  ): void {
    RED.nodes.createNode(this, config);
    const url = urlFromString(config.url);
    if (url === undefined) {
      this.status({
        shape: "ring",
        fill: "red",
        text: config.url + " は不正なURLです",
      });
      return;
    }
    this.status({
      shape: "ring",
      fill: "grey",
      text: "APIの情報を取得中...",
    });

    Promise.all([
      definyRpcClient.name({ url: url.toString() }),
      definyRpcClient.functionListByName({ url: url.toString() }),
    ]).then(([name, functionList]) => {
      if (name.type === "error" || functionList.type === "error") {
        this.status({
          shape: "ring",
          fill: "red",
          text: config.url + " は definy RPC のサーバーではありません",
        });
        return;
      }
      const status: Status = {
        name: name.ok,
        functionList: functionList.ok,
      };
      console.log(createdServer, url.toString());
      if (!createdServer.has(url.toString())) {
        createdServer.add(url.toString());
        for (const func of functionList.ok) {
          RED.nodes.registerType(
            "definy-" + func.name.join("-"),
            generateNode({ url, functionDetail: func }),
          );
        }
      }
      this.status({
        shape: "dot",
        fill: "green",
        text: jsonStringify(status),
      });
    });
  }

  RED.nodes.registerType(
    "create-definy-rpc-node",
    CreateDefinyRpcNode,
  );
}
