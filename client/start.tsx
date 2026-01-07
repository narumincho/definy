import { App, LogInState } from "./App.tsx";

import { CreateAccountDialog } from "./CreateAccountDialog.tsx";
import { useEffect, useState } from "preact/hooks";
import { hydrate } from "preact";
import { SigInDialog } from "./SigInDialog.tsx";
import {
  SecretKey,
  secretKeyFromBase64,
  secretKeyToAccountId,
} from "../event/key.ts";

type DialogOpenState = {
  readonly type: "createAccount";
} | {
  readonly type: "login";
};

function AppWithState() {
  const [dialogOpenState, setDialogOpenState] = useState<
    DialogOpenState | null
  >(null);
  const [logInState, setLogInState] = useState<LogInState>({
    type: "loading",
  });

  useEffect(() => {
    if (logInState?.type === "logIn" && !logInState.accountId) {
      secretKeyToAccountId(logInState.secretKey).then((accountId) => {
        setLogInState({
          type: "logIn",
          secretKey: logInState.secretKey,
          accountId,
        });
      });
    }
  }, [logInState]);

  useEffect(() => {
    loginByNavigatorCredentialsGet().then((secretKey) => {
      if (secretKey) {
        console.log("Web Credential APIによる自動ログインをしました");
        setLogInState({ type: "logIn", secretKey, accountId: undefined });
      }
    });
  }, []);

  const handleOpenCreateAccountDialog = () => {
    setDialogOpenState({
      type: "createAccount",
    });
  };

  const handleOpenSigninDialog = async () => {
    setDialogOpenState({
      type: "login",
    });
  };

  const handleLogout = () => {
    setLogInState({ type: "noLogIn" });
    setDialogOpenState(null);
  };

  return (
    <>
      <App
        logInState={logInState}
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
}

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
