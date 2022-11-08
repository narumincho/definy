/// <reference lib="dom" />
import React from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import { isValidUrl } from "./isValidUrl.ts";
import { Form } from "./Form.tsx";
import { red } from "./nodeRed.ts";

let editingUrl = "";

// ブラウザで動作
red.nodes.registerType<{ url: string }>("create-definy-rpc-node", {
  category: "function",
  color: "#a6bbcf",
  defaults: {
    url: {
      value: "",
      required: true,
      validate: isValidUrl,
    },
  },
  inputs: 0,
  outputs: 0,
  label: function () {
    console.log(this);
    return (
      this.url + "の definy RPC サーバーと接続する" ??
      "definy RPC サーバーと接続. originUrl を設定してね"
    );
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
      />
    );
  },
  oneditsave: function () {
    this.url = editingUrl;
  },
});
