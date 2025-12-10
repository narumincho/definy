import { App } from "./App.tsx";

import { CreateAccountDialog } from "./CreateAccountDialog.tsx";
import { useEffect, useState } from "preact/hooks";
import { hydrate } from "preact";
import { SigInDialog } from "./SigInDialog.tsx";
import { GenerateKeyResult, stringToPrivateKey } from "../event/key.ts";

type DialogOpenState = {
  readonly type: "createAccount";
} | {
  readonly type: "login";
};

const AppWithState = () => {
  const [state, setState] = useState(0);
  const [dialogOpenState, setDialogOpenState] = useState<
    DialogOpenState | null
  >(null);
  const [privateKey, setPrivateKey] = useState<GenerateKeyResult | null>(
    null,
  );

  useEffect(() => {
    loginByNavigatorCredentialsGet().then((privateKey) => {
      if (privateKey) {
        setPrivateKey(privateKey);
      }
    });
  }, []);

  const handleOpenCreateAccountDialog = async () => {
    setDialogOpenState({
      type: "createAccount",
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
    <>
      <App
        state={state}
        setState={setState}
        accountId={privateKey?.publicKeyAsBase64 ?? null}
        onOpenCreateAccountDialog={handleOpenCreateAccountDialog}
        onOpenSigninDialog={handleOpenSigninDialog}
      />
      {dialogOpenState?.type === "createAccount" &&
        (
          <CreateAccountDialog
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
    </>
  );
};

hydrate(<AppWithState />, document.body);

/**
 * Web Credential APIを使用してログインする
 * @returns 秘密鍵
 */
async function loginByNavigatorCredentialsGet(): Promise<
  GenerateKeyResult | undefined
> {
  const credential = (await navigator.credentials.get(
    { password: true } as CredentialRequestOptions,
  )) as {
    password?: string;
  } | null;
  if (!credential?.password) {
    return;
  }
  return await stringToPrivateKey(
    credential.password,
  );
}
