import { Dialog } from "./Dialog.tsx";
import { useEffect, useState } from "preact/hooks";
import { ExportablePrivateKey, generateExportablePrivateKey } from "./key.ts";

export const CreateAccountDialog = ({ onClose }: {
  readonly onClose: () => void;
}) => {
  const [privateKey, setPrivateKey] = useState<
    ExportablePrivateKey | undefined
  >(undefined);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    generateExportablePrivateKey().then(setPrivateKey);
  }, []);

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
            <button type="button" onClick={onClose}>
              x
            </button>
          </div>
          <label>
            <div>Account ID</div>
            <div>{privateKey.accountId}</div>
          </label>
          <label>
            <div>Username</div>
            <input type="text" required />
          </label>
          <label>
            <div>
              Password (auto created. If you lose this password, you will not be
              able to log in.)
            </div>
            <input
              type="password"
              value={privateKey.base64}
              readOnly
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  privateKey.base64,
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
          <button type="submit">Sign up</button>
        </form>
      )}
    </Dialog>
  );
};
