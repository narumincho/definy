import { App } from "./App.tsx";

import { CreateAccountDialog } from "./CreateAccountDialog.tsx";
import { useEffect, useState } from "preact/hooks";
import { hydrate } from "preact";
import { SigInDialog } from "./SigInDialog.tsx";
import { SecretKey, secretKeyFromBase64 } from "../event/key.ts";

type DialogOpenState = {
  readonly type: "createAccount";
} | {
  readonly type: "login";
};

const AppWithState = () => {
  const [dialogOpenState, setDialogOpenState] = useState<
    DialogOpenState | null
  >(null);
  const [privateKey, setPrivateKey] = useState<SecretKey | null>(
    null,
  );

  useEffect(() => {
    loginByNavigatorCredentialsGet().then((privateKey) => {
      if (privateKey) {
        setPrivateKey(privateKey);
      }
    });
  }, []);

  const handleOpenCreateAccountDialog = () => {
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

  const handleLogout = () => {
    setPrivateKey(null);
    setDialogOpenState(null);
  };

  return (
    <>
      <App
        secretKey={privateKey}
        onOpenCreateAccountDialog={handleOpenCreateAccountDialog}
        onOpenSigninDialog={handleOpenSigninDialog}
        onLogout={handleLogout}
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
  SecretKey | undefined
> {
  const credential = (await navigator.credentials.get(
    { password: true } as CredentialRequestOptions,
  )) as {
    password?: string;
  } | null;
  if (!credential?.password) {
    return;
  }
  return secretKeyFromBase64(credential.password);
}
