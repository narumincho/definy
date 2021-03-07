import * as app from "./app";
import * as messageAndState from "./messageAndState";
import { diff, patch } from "@narumincho/html";
import { View } from "@narumincho/html/view";
import { useRenderState } from "@narumincho/html/renderState";

const pushMessageList = (message: messageAndState.Message): void => {
  messageList.push(message);
};

const loop = () => {
  requestAnimationFrame(loop);
  if (messageList.length === 0) {
    return;
  }
  console.log("handle message!", [...messageList]);
  while (true) {
    const message = messageList.shift();
    if (message === undefined) {
      break;
    }
    state = app.updateStateByMessage(pushMessageList, message, state);
  }
  const newView = app.stateToView(state);
  const diffData = diff.createViewDiff(oldView, newView);
  console.log("view diff", oldView, newView, diffData);
  oldView = newView;
  patch.patchView(diffData, patchState);
};

const messageList: Array<messageAndState.Message> = [];
let state: messageAndState.State = app.initState(pushMessageList);
let oldView: View<messageAndState.Message> = app.stateToView(state);
const patchState = useRenderState(pushMessageList);
patch.renderView(oldView, patchState);
loop();
