/// <reference lib="dom" />
import React from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import { urlFromString } from "./urlFromString.ts";
import { Form } from "./Form.tsx";
import { red } from "./nodeRed.ts";
import { Status } from "../server/status.ts";
import { GeneratedNodeForm } from "./GeneratedNodeForm.tsx";

const createNodeFromStatus = (statusAsString: string): void => {
  const status: Status = JSON.parse(statusAsString);
  for (const func of status.functionList) {
    const id = "definy-" + func.name.join("-");
    red.nodes.registerType<unknown>(id, {
      category: "definyGenerated",
      color: "#a6bbcf",
      defaults: {},
      inputs: 0,
      outputs: 0,
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
    if (this.status.fill === "green" && !creating) {
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
        statusText={this.status.text}
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
