import { urlFromString } from "../client/urlFromString.ts";
import type { Node, NodeAPI, NodeDef } from "./nodeRedServer.ts";
import type { Status } from "./status.ts";
import { jsonStringify } from "../../typedJson.ts";
import {
  DefinyRpcTypeInfo,
  FunctionDetail,
} from "../../definyRpc/core/coreType.ts";
import { requestQuery } from "../../definyRpc/core/request.ts";
import {
  functionNamespaceToString,
  namespaceToString,
} from "../../definyRpc/codeGen/namespace.ts";
import {
  functionListByName,
  name,
  typeList,
} from "../../definyRpc/example/generated/meta.ts";

const createdServer = new Map<
  string,
  { readonly typeList: ReadonlyArray<DefinyRpcTypeInfo> }
>();

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
          typeMap: new Map(
            createdServer.get(parameter.url.toString())?.typeList.map(
              (
                type,
              ) => [namespaceToString(type.namespace) + "." + type.name, type],
            ) ?? [],
          ),
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
      typeList({ url }),
    ]).then(([name, functionList, typeList]) => {
      if (
        name.type === "error" || functionList.type === "error" ||
        typeList.type === "error"
      ) {
        setStatus({
          shape: "ring",
          fill: "red",
          text: urlText + " は definy RPC のサーバーではないか, エラーが発生しました",
        });
        return;
      }
      const status: Status = {
        name: name.value,
        // TODO
        functionList: functionList.value as unknown as ReadonlyArray<
          FunctionDetail
        >,
        typeList: typeList.value as unknown as ReadonlyArray<DefinyRpcTypeInfo>,
      };
      console.log(createdServer, url.toString());
      if (!createdServer.has(url.toString())) {
        createdServer.set(url.toString(), { typeList: status.typeList });
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
