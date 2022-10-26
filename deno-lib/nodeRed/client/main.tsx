/// <reference lib="dom" />
/// <reference path="./nodeRed.d.ts" />

import React from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import { TypedInput } from "./TypedInput.tsx";

type State =
  | {
      readonly type: "initView";
    }
  | {
      readonly type: "input";
      readonly originUrl: string;
      readonly checkingUrl: string;
      readonly checkingUrlResult: UrlConnectionResult | undefined;
    };

type UrlConnectionResult = "invalidUrl" | "ok" | "error";

const urlValidation = async (urlText: string): Promise<UrlConnectionResult> => {
  if (!isValidUrl(urlText)) {
    return "invalidUrl";
  }
  const ok = await checkValidDefinyRpcServer(urlText);
  if (ok) {
    return "ok";
  }
  return "error";
};

const App = (): React.ReactElement => {
  const inputElementRef = React.useRef<HTMLInputElement>(null);
  const [state, setState] = React.useState<State>({ type: "initView" });
  const [originText, setOriginText] = React.useState<string>("");
  const [count, setCount] = React.useState<number>(0);

  React.useEffect(() => {
    if (inputElementRef.current !== null) {
      const originUrl = inputElementRef.current.value;
      setState({
        type: "input",
        originUrl,
        checkingUrl: originUrl,
        checkingUrlResult: undefined,
      });
      setOriginText(originText);
      urlValidation(originUrl).then((result) => {
        setState((old) => {
          if (old.type === "initView") {
            return {
              type: "input",
              originUrl,
              checkingUrl: originUrl,
              checkingUrlResult: result,
            };
          }
          return {
            type: "input",
            originUrl: old.originUrl,
            checkingUrl: originUrl,
            checkingUrlResult: result,
          };
        });
      });
    }
  }, [inputElementRef.current]);

  React.useEffect(() => {
    urlValidation(originText).then((result) => {
      setState((old) => {
        if (old.type === "initView") {
          return {
            type: "input",
            originUrl: originText,
            checkingUrl: originText,
            checkingUrlResult: result,
          };
        }
        return {
          type: "input",
          originUrl: old.originUrl,
          checkingUrl: originText,
          checkingUrlResult: result,
        };
      });
    });
  }, [originText]);

  return (
    <div className="form-row">
      <label htmlFor="node-input-originUrl">
        <i className="icon-tag"></i>originUrl
      </label>
      <input
        type="text"
        id="node-input-originUrl"
        placeholder="https://narumincho-definy.deno.dev/"
        ref={inputElementRef}
        onChange={(e) => {
          setOriginText(e.target.value);
        }}
      />
      <div id="definy-originUrl-validationResult"></div>
      <div>React でレンダリングしたよ</div>
      <div>{JSON.stringify(state)}</div>
      <div>
        <div>カウンター: {count}</div>
        <button
          onClick={() => {
            setCount((prev) => prev + 1);
          }}
        >
          +
        </button>
      </div>
      <div>
        <button
          onClick={() => {
            createNodeDynamic();
          }}
        >
          ダイナミックノードの作成
        </button>
      </div>
      <TypedInput id="node-input-example1" />
    </div>
  );
};

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
    const reactRoot = createRoot(formRoot);
    reactRoot.render(<App />);
  },
});

const createNodeDynamic = () => {
  RED.nodes.registerType<{ originUrl: string }>("definy-dynamic-node", {
    category: "function",
    color: "#a6bbcf",
    defaults: {
      sample: {
        value: "",
        required: true,
        validate: isValidUrl,
      },
    },
    inputs: 1,
    outputs: 1,
    label: "definy-dynamic-node",
    oneditprepare: function () {
      const formRoot = document.getElementById("definy-form-root");
      if (formRoot === null) {
        console.log("formRoot見つからず");
        return;
      }
      const reactRoot = createRoot(formRoot);
      reactRoot.render(<App />);
    },
  });
};
