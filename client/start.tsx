import { App } from "./app.tsx";
import { utils } from "@noble/secp256k1";
import { encodeBase64Url } from "@std/encoding/base64url";
import { CreateAccountDialog } from "./CreateAccountDialog.tsx";
import { FC, useState } from "hono/jsx";
import { render } from "hono/jsx/dom";
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

  return (
    <div>
      <App
        state={state}
        setState={setState}
        onOpenCreateAccountDialog={() => {
          setDialogOpenState({
            type: "createAccount",
            privateKey: utils.randomPrivateKey(),
          });
        }}
        onOpenSigninDialog={() => {
          setDialogOpenState({
            type: "login",
          });
        }}
      />
      {dialogOpenState?.type === "createAccount" &&
        (
          <CreateAccountDialog
            privateKey={dialogOpenState.privateKey}
            copyPassword={() => {
              if (dialogOpenState === null) {
                return;
              }
              navigator.clipboard.writeText(
                encodeBase64Url(dialogOpenState.privateKey),
              );
            }}
            onClose={() => setDialogOpenState(null)}
          />
        )}

      {dialogOpenState?.type === "login" &&
        <SigInDialog onClose={() => setDialogOpenState(null)} />}
    </div>
  );
};

render(<AppWithState />, document.body);
