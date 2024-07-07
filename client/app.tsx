import {
  Dispatch,
  StateUpdater,
} from "https://esm.sh/preact@10.22.1/hooks?pin=v135";
import { h } from "https://esm.sh/preact@10.22.1?pin=v135";
import { encodeBase64Url } from "jsr:@std/encoding/base64url";

export const App = (props: {
  readonly state: number;
  readonly privateKey: Uint8Array | null;
  readonly setState: Dispatch<StateUpdater<number>>;
  readonly signUp: () => void;
  readonly copyPassword: () => void;
}) => {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <h1>definy</h1>
      <button
        type="button"
        onClick={() => {
          props.setState((prev) => prev + 1);
        }}
      >
        count: {props.state}
      </button>
      <button type="button" onClick={props.signUp}>
        Sign Up
      </button>

      {props.privateKey === null ? <div></div> : (
        <dialog
          open
          style={{
            width: "80%",
            boxShadow: "0px 20px 36px 0px rgba(0, 0, 0, 0.6)",
          }}
        >
          <form
            style={{
              display: "grid",
            }}
          >
            <label>
              Username
              <input type="text" required />
            </label>
            <label>
              Password (auto created. If you lose this password, you will not be
              able to log in.)
              <input
                value={encodeBase64Url(props.privateKey)}
                readOnly={true}
                type="password"
                autoComplete="new-password"
              />
              <button type="button" onClick={props.copyPassword}>
                copy password
              </button>
            </label>
            <button type="submit">sign up!</button>
          </form>
        </dialog>
      )}
    </div>
  );
};
