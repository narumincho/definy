import { App } from "./app.tsx";
import { h, hydrate, JSX } from "https://esm.sh/preact@10.22.1?pin=v135";
import { useState } from "https://esm.sh/preact@10.22.1/hooks?pin=v135";
import { utils } from "jsr:@noble/secp256k1";
import { encodeBase64Url } from "jsr:@std/encoding/base64url";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("root element not found");
}

const AppWithState = (): JSX.Element => {
  const [state, setState] = useState(0);
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);

  return (
    <App
      state={state}
      privateKey={privateKey}
      setState={setState}
      signUp={() => {
        setPrivateKey(utils.randomPrivateKey());
      }}
      copyPassword={() => {
        if (privateKey === null) {
          return;
        }
        navigator.clipboard.writeText(encodeBase64Url(privateKey));
      }}
    />
  );
};

hydrate(<AppWithState />, root);
