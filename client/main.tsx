import {
  Dispatch,
  StateUpdater,
} from "https://esm.sh/preact@10.22.1/hooks?pin=v135";
import { h } from "https://esm.sh/preact@10.22.1?pin=v135";

export const App = (props: {
  readonly state: number;
  readonly setState: Dispatch<StateUpdater<number>>;
}) => {
  return (
    <div>
      <h1>definy</h1>
      <button
        onClick={() => {
          props.setState((prev) => prev + 1);
        }}
      >
        count: {props.state}
      </button>
    </div>
  );
};
