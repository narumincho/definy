import { Message, State } from "./state";
import { createPatchState, domToView, patchView } from "./view/patch";
import { initState, stateToView, updateState } from "./app";
import { createViewDiff } from "./view/diff";

const initView = domToView();
if (initView._ === "Error") {
  console.error("DOMの初期状態を解釈できなかった", initView.error);
  throw new Error("DOMの初期状態を解釈できなかった");
}

const messageHandler = (message: Message): void => {
  state = updateState(message, state);
  render(state);
};

const render = (state: State) => {
  const newView = stateToView(state);
  const diff = createViewDiff(oldView, newView);
  console.log("view diff", oldView, newView, diff);
  patchView(diff, patchState);
};

let state: State = initState(messageHandler);
const oldView = initView.ok;
const patchState = createPatchState(messageHandler);
render(state);
