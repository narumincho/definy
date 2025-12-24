import { Dialog } from "./Dialog.tsx";
import { useCallback, useEffect, useState } from "preact/hooks";
import { TargetedEvent } from "preact";
import {
  AccountId,
  generateSecretKey,
  SecretKey,
  secretKeyToAccountId,
} from "../event/key.ts";
import { signEvent } from "../event/signedEvent.ts";

export const CreateAccountDialog = ({ onClose }: {
  readonly onClose: () => void;
}) => {
  const [secretKey, setSecretKey] = useState<SecretKey | undefined>(undefined);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      setSecretKey(await generateSecretKey());
    })();
  }, []);

  const onSubmit = useCallback(
    async (e: TargetedEvent<HTMLFormElement, Event>) => {
      e.preventDefault();

      console.log(secretKey);
      if (!secretKey) {
        return;
      }
      setSubmitting(true);
      const usernameInput = e.currentTarget.elements.namedItem("username");
      if (usernameInput instanceof HTMLInputElement) {
        await fetch("/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: new Uint8Array(
            await signEvent({
              type: "create_account",
              name: usernameInput.value,
              accountId: await secretKeyToAccountId(secretKey),
              time: new Date(),
            }, secretKey),
          ),
        });
        onClose();
      }
    },
    [secretKey, onClose],
  );

  return (
    <Dialog
      isOpen
      onClose={onClose}
    >
      {secretKey === undefined ? <div>Generating key...</div> : (
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
            <AccountIdView secretKey={secretKey} />
          </label>
          <label>
            <div>Account Name</div>
            <input
              type="text"
              name="username"
              autocomplete="username"
              required
              disabled={submitting}
            />
          </label>
          <label>
            <div>
              Secret Key (auto created. If you lose this secret key, you will
              not be able to log in.)
            </div>
            <input
              type="password"
              value={secretKey.toBase64({ alphabet: "base64url" })}
              readOnly
              autoComplete="new-password"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  secretKey.toBase64({ alphabet: "base64url" }),
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

function AccountIdView({ secretKey }: { readonly secretKey: SecretKey }) {
  const [accountId, setAccountId] = useState<AccountId | null>(null);

  useEffect(() => {
    secretKeyToAccountId(secretKey).then(setAccountId);
  }, []);

  return (
    <div>
      {accountId?.toBase64({ alphabet: "base64url" })}
    </div>
  );
}
