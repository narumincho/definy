import { urlFromString } from "../client/urlFromString.ts";
import type { Node, NodeAPI, NodeDef } from "./nodeRedServer.ts";
import type { Status } from "./status.ts";
import { jsonStringify } from "../../typedJson.ts";
import { FunctionDetail } from "../../definyRpc/core/coreType.ts";
import { requestQuery } from "../../definyRpc/core/request.ts";
import { functionNamespaceToString } from "../../definyRpc/codeGen/namespace.ts";
import {
  functionListByName,
  name,
} from "../../definyRpc/example/generated/meta.ts";

const createdServer = new Set<string>();

// Node.js 内で動作
export default function (RED: NodeAPI) {
  const generateNode = (
    parameter: {
      readonly url: URL;
      readonly functionDetail: FunctionDetail;
    },
  ) => {
    // eslint-disable-next-line func-style
    return function (this: Node, config: NodeDef): void {
      RED.nodes.createNode(this, config);
      this.on("input", (msg, send) => {
        requestQuery({
          url: new URL(parameter.url),
          input: msg,
          namespace: parameter.functionDetail.namespace,
          name: parameter.functionDetail.name,
          inputType: parameter.functionDetail.input,
          outputType: parameter.functionDetail.output,
          typeMap: new Map(),
        }).then((json) => {
          send({ payload: json });
        });
      });
    };
  };

  const generateNodesFromUrl = (urlText: string, setStatus: Node["status"]) => {
    const url = urlFromString(urlText);
    if (url === undefined) {
      setStatus({
        shape: "ring",
        fill: "red",
        text: urlText + " は不正なURLです",
      });
      return;
    }
    setStatus({
      shape: "ring",
      fill: "grey",
      text: "APIの情報を取得中...",
    });

    Promise.all([
      name({ url }),
      functionListByName({ url }),
    ]).then(([name, functionList]) => {
      if (name.type === "error" || functionList.type === "error") {
        setStatus({
          shape: "ring",
          fill: "red",
          text: urlText + " は definy RPC のサーバーではありません",
        });
        return;
      }
      const status: Status = {
        // TODO
        name: name.value as unknown as string,
        // TODO
        functionList: functionList.value as unknown as ReadonlyArray<
          FunctionDetail
        >,
      };
      console.log(createdServer, url.toString());
      if (!createdServer.has(url.toString())) {
        createdServer.add(url.toString());
        for (const func of status.functionList) {
          RED.nodes.registerType(
            "definy-" + functionNamespaceToString(func.namespace) + "." +
              func.name,
            generateNode({ url, functionDetail: func }),
          );
        }
      }
      setStatus({
        shape: "dot",
        fill: "green",
        text: jsonStringify(status),
      });
    });
  };

  // eslint-disable-next-line func-style
  function CreateDefinyRpcNode(
    this: Node,
    config: NodeDef & { url: string },
  ): void {
    RED.nodes.createNode(this, config);
    generateNodesFromUrl(config.url, (e) => this.status(e));
  }

  RED.nodes.registerType(
    "create-definy-rpc-node",
    CreateDefinyRpcNode,
  );

  console.log(RED);
  // RED.nodes.eachNode((node) => {
  //   console.log("e", node);
  //   if (node.type === "create-definy-rpc-node") {
  //     console.log("matched node ", node);
  //     console.log("matched node get ", RED.nodes.getNode(node.id));
  //   }
  // });
}
