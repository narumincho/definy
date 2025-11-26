import { App } from "./app.tsx";

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

  const handleOpenCreateAccountDialog = () => {
    setDialogOpenState({
      type: "createAccount",
      privateKey: crypto.getRandomValues(new Uint8Array(32)),
    });
  };

  return (
    <div>
      <App
        state={state}
        setState={setState}
        onOpenCreateAccountDialog={handleOpenCreateAccountDialog}
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
                dialogOpenState.privateKey.toBase64({ alphabet: "base64url" }),
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
