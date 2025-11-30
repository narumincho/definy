import { App } from "./App.tsx";

import { CreateAccountDialog } from "./CreateAccountDialog.tsx";
import { FC, useState } from "@hono/hono/jsx";
import { render } from "@hono/hono/jsx/dom";
import { SigInDialog } from "./SigInDialog.tsx";

type DialogOpenState = {
  readonly type: "createAccount";
  readonly privateKey: Uint8Array;
} | {
  readonly type: "login";
};

const AppWithState: FC = () => {
  const [state, setState] = useState(0);
  const [dialogOpenState, setDialogOpenState] = useState<
    DialogOpenState | null
  >(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);

  const handleOpenCreateAccountDialog = () => {
    setDialogOpenState({
      type: "createAccount",
      privateKey: crypto.getRandomValues(new Uint8Array(32)),
    });
  };

  const handleOpenSigninDialog = async () => {
    const privateKey = await loginByNavigatorCredentialsGet();
    if (privateKey) {
      setPrivateKey(privateKey);
      return;
    }
    setDialogOpenState({
      type: "login",
    });
  };

  return (
    <div>
      <App
        state={state}
        setState={setState}
        onOpenCreateAccountDialog={handleOpenCreateAccountDialog}
        onOpenSigninDialog={handleOpenSigninDialog}
      />
      {dialogOpenState?.type === "createAccount" &&
        (
          <CreateAccountDialog
            privateKey={dialogOpenState.privateKey}
            onClose={() => {
              setDialogOpenState(null);
            }}
          />
        )}

      {dialogOpenState?.type === "login" &&
        (
          <SigInDialog
            onClose={() => {
              setDialogOpenState(null);
            }}
          />
        )}
    </div>
  );
};

render(<AppWithState />, document.body);

const ED25519_PKCS8_HEADER = new Uint8Array([
  48,
  46,
  2,
  1,
  0,
  48,
  5,
  6,
  3,
  43,
  101,
  112,
  4,
  34,
  4,
  32,
]);

async function loginByNavigatorCredentialsGet(): Promise<
  CryptoKey | undefined
> {
  const credential = (await navigator.credentials.get(
    { password: true } as CredentialRequestOptions,
  )) as {
    password?: string;
  } | null;
  if (!credential?.password) {
    return;
  }
  const privateKeyAsBase64 = credential.password;
  const privateKeyAsBinary = Uint8Array.fromBase64(privateKeyAsBase64, {
    alphabet: "base64url",
  });
  const privateKeyAsPicks8 = new Uint8Array([
    ...ED25519_PKCS8_HEADER,
    ...privateKeyAsBinary,
  ]).buffer;
  const privateKeyAsCryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyAsPicks8,
    { name: "Ed25519" },
    false,
    ["sign"],
  );

  return privateKeyAsCryptoKey;
}
