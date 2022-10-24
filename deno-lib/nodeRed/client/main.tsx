/// <reference lib="dom" />

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
RED.nodes.registerType("send-to-definy", {
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
  label: function (this: { originUrl: string }) {
    console.log(this);
    return (
      this.originUrl + "の definy RPC サーバーと接続する" ??
      "definy RPC サーバーと接続. originUrl を設定してね"
    );
  },
  oneditsave: function () {},
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
