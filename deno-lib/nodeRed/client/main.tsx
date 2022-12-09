import React from "https://esm.sh/react@18.2.0?pin=v99";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client?pin=v99";
import { urlFromString } from "./urlFromString.ts";
import { Form } from "./Form.tsx";
import { red } from "./nodeRed.ts";
import { Status } from "../server/status.ts";
import { GeneratedNodeForm } from "./GeneratedNodeForm.tsx";
import {
  functionNamespaceToString,
  namespaceToString,
} from "../../definyRpc/codeGen/namespace.ts";

const escapeHtml = (text: string): string => {
  return text.replace(/[&'`"<>]/ug, (match) => {
    return {
      "&": "&amp;",
      "'": "&#x27;",
      "`": "&#x60;",
      '"': "&quot;",
      "<": "&lt;",
      ">": "&gt;",
    }[match] as string;
  });
};

const createNodeFromStatus = (statusAsString: string): void => {
  const status: Status = JSON.parse(statusAsString);

  for (const func of status.functionList) {
    const id = "definy-" + functionNamespaceToString(func.namespace) + "." +
      func.name;

    const scriptElement = document.createElement("script");
    scriptElement.type = "text/html";
    scriptElement.dataset["helpName"] = id;
    scriptElement.textContent = `<div>
  <div>${escapeHtml(functionNamespaceToString(func.namespace))}</div>
  <h2>${escapeHtml(func.name)}</h2>
  <div>${escapeHtml(func.description)}</div>
  <div>input: ${
      escapeHtml(
        namespaceToString(func.input.namespace) + "." + func.input.name,
      )
    }</div>
  <div>output: ${
      namespaceToString(func.output.namespace) + "." + func.output.name
    }</div>
</>`;
    document.getElementById("definy-html-output")
      ?.appendChild(
        scriptElement,
      );

    red.nodes.registerType<unknown>(id, {
      category: "definyGenerated" + status.name.toUpperCase(),
      color: "#a6bbcf",
      defaults: {},
      inputs: 1,
      outputs: 1,
      label: function () {
        return id;
      },
      oneditprepare: () => {
        const formRoot = document.getElementById("dialog-form");
        if (formRoot === null) {
          console.log("id=dialog-form 見つからず");
          return;
        }
        const reactRoot = createRoot(formRoot);
        reactRoot.render(
          <GeneratedNodeForm
            functionDetail={func}
          />,
        );
      },
    });
  }
};

let editingUrl = "";
let creating = false;

// ブラウザで動作
red.nodes.registerType<{ url: string }>("create-definy-rpc-node", {
  category: "definy",
  color: "#a6bbcf",
  defaults: {
    url: {
      value: "https://narumincho-definy.deno.dev/",
      required: true,
      validate: urlFromString,
    },
  },
  inputs: 0,
  outputs: 0,
  label: function () {
    console.log(this);
    if (this.status?.fill === "green" && !creating) {
      creating = true;
      createNodeFromStatus(this.status.text);
      return "ノードを作成中...?";
    }
    return (this.url ?? "definy RPC") + " の ノードを作成する";
  },
  oneditprepare: function () {
    const formRoot = document.getElementById("definy-form-root");
    if (formRoot === null) {
      console.log("formRoot見つからず");
      return;
    }
    const reactRoot = createRoot(formRoot);
    reactRoot.render(
      <Form
        statusText={this.status?.text ?? "ステータス未設定"}
        initUrl={this.url}
        onChangeUrl={(newUrl) => {
          editingUrl = newUrl;
        }}
      />,
    );
  },
  oneditsave: function () {
    this.url = editingUrl;
  },
});
