/// <reference lib="dom" />

import React from "https://cdn.skypack.dev/react@18.2.0?dts";
import ReactDom from "https://cdn.skypack.dev/react-dom@18.2.0?dts";

/*
 * 同時に `./nodeRed.d.ts` を開くとエディタ上の型エラーがなくなる
 */

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const checkValidDefinyRpcServer = async (
  originUrl: string
): Promise<boolean> => {
  const url = new URL(window.location.href);
  url.pathname = "/definy";
  const responseJson = await (
    await fetch(url, {
      method: "POST",
      body: JSON.stringify({ originUrl: originUrl }),
    })
  ).json();

  return responseJson.connectionResult;
};

// ブラウザで動作
RED.nodes.registerType<{ originUrl: string }>("send-to-definy", {
  category: "function",
  color: "#a6bbcf",
  defaults: {
    originUrl: {
      value: "",
      required: true,
      validate: isValidUrl,
    },
  },
  inputs: 1,
  outputs: 1,
  label: function () {
    console.log(this);
    return (
      this.originUrl + "の definy RPC サーバーと接続する" ??
      "definy RPC サーバーと接続. originUrl を設定してね"
    );
  },
  oneditprepare: function () {
    const formRoot = document.getElementById("definy-form-root");
    if (formRoot === null) {
      console.log("formRoot見つからず");
      return;
    }
    ReactDom.render(
      <div className="form-row">
        <label htmlFor="node-input-originUrl">
          <i className="icon-tag"></i>originUrl
        </label>
        <input
          type="text"
          id="node-input-originUrl"
          placeholder="https://narumincho-definy.deno.dev/"
        />
        <div id="definy-originUrl-validationResult"></div>
        <div>React でレンダリングしたよ</div>
      </div>,
      formRoot
    );
  },
});

window.definyOriginUrlOnInput = () => {
  const originUrl = (
    document.getElementById("node-input-originUrl") as HTMLInputElement
  ).value;
  const validationResult = document.getElementById(
    "definy-originUrl-validationResult"
  );
  if (validationResult === null) {
    console.log("フォームの表示先が見つかりませんでした");
    return;
  }
  if (!isValidUrl(originUrl)) {
    validationResult.textContent = originUrl + "は正当なURLではありません";
    return;
  }
  validationResult.textContent = originUrl + "に接続できるか試しています...";
  checkValidDefinyRpcServer(originUrl).then((ok) => {
    if (ok) {
      validationResult.textContent =
        originUrl +
        "は正当なURLで HTTP サーバーを公開していることを確認しました. definy RPC サーバーを実装できているかの確認はそのうちできるようにします";
      return;
    }
    validationResult.textContent =
      originUrl + "は正当なURLですが接続できませんでした.";
  });
};
