import { App } from "./main.tsx";
import { h, hydrate, JSX } from "https://esm.sh/preact@10.22.1?pin=v135";
import { useState } from "https://esm.sh/preact@10.22.1/hooks?pin=v135";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("root element not found");
}

const AppWithState = (): JSX.Element => {
  const [state, setState] = useState(0);
  return <App state={state} setState={setState} />;
};

hydrate(<AppWithState />, root);
