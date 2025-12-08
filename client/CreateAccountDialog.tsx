import { Dialog } from "./Dialog.tsx";
import { useCallback, useEffect, useState } from "preact/hooks";
import { generateExportablePrivateKey, GenerateKeyResult } from "./key.ts";
import { encodeCreateAccountEvent } from "../event/main.ts";
import { TargetedEvent } from "preact";

export const CreateAccountDialog = ({ onClose }: {
  readonly onClose: () => void;
}) => {
  const [privateKey, setPrivateKey] = useState<
    GenerateKeyResult | undefined
  >(undefined);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    generateExportablePrivateKey().then(setPrivateKey);
  }, []);

  const onSubmit = useCallback(
    (e: TargetedEvent<HTMLFormElement, Event>) => {
      e.preventDefault();
      setSubmitting(true);
      const usernameInput = e.currentTarget.elements.namedItem("username");
      if (usernameInput instanceof HTMLInputElement) {
        const event = encodeCreateAccountEvent({
          name: usernameInput.value,
        });
        console.log(event);
        // TODO ここで署名をする
        fetch("/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: new Uint8Array(event),
        }).then(() => {
          onClose();
        });
      }
    },
    [],
  );

  return (
    <Dialog
      isOpen
      onClose={onClose}
    >
      {privateKey === undefined ? <div>Generating key...</div> : (
        <form
          method="dialog"
          style={{
            display: "grid",
            gap: 16,
          }}
          onSubmit={onSubmit}
        >
          <div
            style={{
              display: "flex",
            }}
          >
            <h2
              style={{
                margin: 0,
                flexGrow: 1,
              }}
            >
              Sign up
            </h2>
            <button type="button" disabled={submitting} onClick={onClose}>
              x
            </button>
          </div>
          <label>
            <div>Account ID</div>
            <div>{privateKey.publicKeyAsBase64}</div>
          </label>
          <label>
            <div>Username</div>
            <input type="text" name="username" required disabled={submitting} />
          </label>
          <label>
            <div>
              Password (auto created. If you lose this password, you will not be
              able to log in.)
            </div>
            <input
              type="password"
              value={privateKey.privateKeyAsBase64}
              readOnly
              autoComplete="new-password"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  privateKey.privateKeyAsBase64,
                ).then(() => {
                  setIsCopied(true);
                  setTimeout(() => {
                    setIsCopied(false);
                  }, 2000);
                }).catch((e) => {
                  console.error("Failed to copy", e);
                  alert("Failed to copy password");
                });
              }}
            >
              {isCopied ? "Copied!" : "copy password"}
            </button>
          </label>
          <button type="submit" disabled={submitting}>Sign up</button>
        </form>
      )}
      {submitting && <div>Signing up...</div>}
    </Dialog>
  );
};
