import { State, initState, stateToView, updateState } from "./app";
import { createPatchState, domToView, patchView } from "./view/patch";
import { Message } from "./appInterface";
import { createViewDiff } from "./view/diff";

const initView = domToView();
if (initView._ === "Error") {
  console.error("DOMの初期状態を解釈できなかった", initView.error);
  throw new Error("DOMの初期状態を解釈できなかった");
}

const messageHandler = (message: Message): void => {
  state = updateState(messageHandler, message, state);
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
