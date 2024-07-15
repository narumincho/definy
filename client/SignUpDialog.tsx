import { h, JSX } from "https://esm.sh/preact@10.22.1?pin=v135";
import {
  useEffect,
  useRef,
} from "https://esm.sh/preact@10.22.1/hooks?pin=v135";
import { encodeBase64Url } from "jsr:@std/encoding/base64url";
import { Dialog } from "./Dialog.tsx";

export const SignUpDialog = (props: {
  readonly privateKey: Uint8Array | null;
  readonly copyPassword: () => void;
  readonly onClose: () => void;
}): JSX.Element | null => {
  if (props.privateKey === null) {
    return null;
  }

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
            Sign Up
          </h2>
          <button type="button" onClick={props.onClose}>
            x
          </button>
        </div>
        <label>
          <div>Username</div>
          <input type="text" required={true} />
        </label>
        <label>
          <div>
            Password (auto created. If you lose this password, you will not be
            able to log in.)
          </div>
          <input
            type="password"
            value={encodeBase64Url(props.privateKey)}
            readOnly={true}
            autoComplete="new-password"
          />
          <button type="button" onClick={props.copyPassword}>
            copy password
          </button>
        </label>
        <button type="submit">Sign Up</button>
      </form>
    </Dialog>
  );
};
