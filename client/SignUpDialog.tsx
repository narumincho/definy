import { h, JSX } from "https://esm.sh/preact@10.22.1?pin=v135";
import {
  useEffect,
  useRef,
} from "https://esm.sh/preact@10.22.1/hooks?pin=v135";
import { encodeBase64Url } from "jsr:@std/encoding/base64url";

export const SignUpDialog = (props: {
  readonly privateKey: Uint8Array | null;
  readonly copyPassword: () => void;
  readonly onClose: () => void;
}): JSX.Element | null => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.addEventListener("close", props.onClose);
    return () => {
      ref.current?.removeEventListener("close", props.onClose);
    };
  }, [props.onClose, ref.current]);

  useEffect(() => {
    if (props.privateKey === null) {
      ref.current?.close();
    } else {
      ref.current?.showModal();
    }
  }, [props.privateKey]);

  if (props.privateKey === null) {
    return null;
  }

  return (
    <dialog
      ref={ref}
      style={{
        width: "80%",
        boxShadow: "0px 20px 36px 0px rgba(0, 0, 0, 0.6)",
      }}
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
          <input type="text" />
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
    </dialog>
  );
};
