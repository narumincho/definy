import { App } from "./app.tsx";
import { h, hydrate, JSX } from "preact";
import { useState } from "preact/hooks";
import { utils } from "@noble/secp256k1";
import { encodeBase64Url } from "@std/encoding/base64url";
import { SignUpDialog } from "./SignUpDialog.tsx";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("root element not found");
}

const AppWithState = (): JSX.Element => {
  const [state, setState] = useState(0);
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);

  return (
    <div>
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
      <SignUpDialog
        privateKey={privateKey}
        copyPassword={() => {
          if (privateKey === null) {
            return;
          }
          navigator.clipboard.writeText(encodeBase64Url(privateKey));
        }}
        onClose={() => setPrivateKey(null)}
      />
    </div>
  );
};

hydrate(<AppWithState />, root);
