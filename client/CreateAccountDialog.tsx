import { Dialog } from "./Dialog.tsx";
import { useState } from "@hono/hono/jsx";

export const CreateAccountDialog = ({ privateKey, onClose }: {
  readonly privateKey: Uint8Array;
  readonly onClose: () => void;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <Dialog
      isOpen={privateKey !== null}
      onClose={onClose}
    >
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
            value={privateKey.toBase64({ alphabet: "base64url" })}
            readOnly
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(
                privateKey.toBase64({ alphabet: "base64url" }),
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
    </Dialog>
  );
};
