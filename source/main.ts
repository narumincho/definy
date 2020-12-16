import * as app from "./app";
import { createPatchState, domToView, patchView } from "./view/patch";
import { Message } from "./appInterface";
import { createViewDiff } from "./view/diff";

const initView = domToView();
if (initView._ === "Error") {
  console.error("DOMの初期状態を解釈できなかった", initView.error);
  throw new Error("DOMの初期状態を解釈できなかった");
}

const pushMessageList = (message: Message): void => {
  messageList.push(message);
};

const render = () => {
  const newView = app.stateToView(state);
  const diff = createViewDiff(oldView, newView);
  console.log("view diff", oldView, newView, diff);
  patchView(diff, patchState);
};

const loop = () => {
  requestAnimationFrame(loop);
  if (messageList.length === 0) {
    return;
  }
  console.log("handle message!", messageList);
  while (true) {
    const message = messageList.shift();
    if (message === undefined) {
      break;
    }
    state = app.updateState(pushMessageList, message, state);
  }
  render();
};

const messageList: Array<Message> = [];
const oldView = initView.ok;
let state: app.State = app.initState(pushMessageList);
const patchState = createPatchState(pushMessageList);
if (messageList.length === 0) {
  render();
}
loop();
