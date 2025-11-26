import { Dialog } from "./Dialog.tsx";

export const CreateAccountDialog = (props: {
  readonly privateKey: Uint8Array;
  readonly copyPassword: () => void;
  readonly onClose: () => void;
}) => {
  return (
    <Dialog
      isOpen={props.privateKey !== null}
      onClose={props.onClose}
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
          <button type="button" onClick={props.onClose}>
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
            value={props.privateKey.toBase64({ alphabet: "base64url" })}
            readOnly
            autoComplete="new-password"
          />
          <button type="button" onClick={props.copyPassword}>
            copy password
          </button>
        </label>
        <button type="submit">Sign up</button>
      </form>
    </Dialog>
  );
};
