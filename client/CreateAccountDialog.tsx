import { Dialog } from "./Dialog.tsx";
import { useCallback, useEffect, useState } from "preact/hooks";
import { TargetedEvent } from "preact";
import { AccountId, generateKeyPair, SecretKey } from "../event/key.ts";
import { signEvent } from "../event/signedEvent.ts";

export const CreateAccountDialog = ({ onClose }: {
  readonly onClose: () => void;
}) => {
  const [keyPair, setKeyPair] = useState<
    {
      secretKey: SecretKey;
      accountId: AccountId;
    } | undefined
  >(undefined);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    generateKeyPair().then(setKeyPair);
  }, []);

  const onSubmit = useCallback(
    async (e: TargetedEvent<HTMLFormElement, Event>) => {
      e.preventDefault();
      if (!keyPair) {
        return;
      }
      setSubmitting(true);
      const usernameInput = e.currentTarget.elements.namedItem("username");
      if (usernameInput instanceof HTMLInputElement) {
        fetch("/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: new Uint8Array(
            await signEvent({
              type: "create_account",
              name: usernameInput.value,
              accountId: keyPair.accountId,
              time: new Date(),
            }, keyPair.secretKey),
          ),
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
      {keyPair === undefined ? <div>Generating key...</div> : (
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
            <div>{keyPair.accountId.toBase64({ alphabet: "base64url" })}</div>
          </label>
          <label>
            <div>Account Name</div>
            <input type="text" name="username" required disabled={submitting} />
          </label>
          <label>
            <div>
              Secret Key (auto created. If you lose this secret key, you will
              not be able to log in.)
            </div>
            <input
              type="password"
              value={keyPair.secretKey.toBase64({ alphabet: "base64url" })}
              readOnly
              autoComplete="new-password"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  keyPair.secretKey.toBase64({ alphabet: "base64url" }),
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
