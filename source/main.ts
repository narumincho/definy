import * as app from "./app";
import * as messageAndState from "./appInterface";
import { createPatchState, patchView, renderView } from "./view/patch";
import { View } from "./view/view";
import { createViewDiff } from "./view/diff";

const pushMessageList = (message: messageAndState.Message): void => {
  messageList.push(message);
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
    state = app.updateStateByMessage(pushMessageList, message, state);
  }
  const newView = app.stateToView(state);
  const diff = createViewDiff(oldView, newView);
  console.log("view diff", oldView, newView, diff);
  oldView = newView;
  patchView(diff, patchState);
};

const messageList: Array<messageAndState.Message> = [];
let state: messageAndState.AppInterface = app.initState(pushMessageList);
let oldView: View<messageAndState.Message> = app.stateToView(state);
const patchState = createPatchState(pushMessageList);
renderView(oldView, patchState);
loop();
