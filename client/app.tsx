import {
  Dispatch,
  StateUpdater,
} from "https://esm.sh/preact@10.22.1/hooks?pin=v135";
import { h } from "https://esm.sh/preact@10.22.1?pin=v135";

export const App = (props: {
  readonly state: number;
  readonly privateKey: Uint8Array | null;
  readonly setState: Dispatch<StateUpdater<number>>;
  readonly signUp: () => void;
  readonly copyPassword: () => void;
}) => {
  console.log("render App", props);
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <h1
        style={{
          margin: 0,
          padding: 16,
        }}
      >
        definy
      </h1>
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
    </div>
  );
};
