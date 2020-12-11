import { Element, View } from "./view";
import { OrderedMap, Range } from "immutable";
import { createPatchState, patchView } from "./patch";
import { div, view } from "./viewUtil";
import { createViewDiff } from "./diff";

const stateToView = (state: string): View<string> =>
  view(
    {
      title: state.toString(),
      themeColor: { r: 0.2, g: 0.6, b: 0.1 },
      language: "Japanese",
    },
    OrderedMap({
      ...(state.length > 10 ? { note: div<string>({}, "10文字超え!") } : {}),
      out: div<string>(
        {
          style: {
            backgroundColor:
              "#" + (state.length * 128).toString(16).padStart(6, "0"),
          },
        },
        state
      ),
      keep: div<string>({}, "いつも同じ"),
      length: div<string>({}, "長さ: " + state.length.toString()),
      ...Object.fromEntries(
        Range(0, state.length).map((_, index): [string, Element<string>] => [
          index.toString(),
          textButton(state.slice(0, index - 1), index),
        ])
      ),
      sorena: div<string>({}, "それな"),
    })
  );

const textButton = (text: string, index: number): Element<string> =>
  div<string>(
    {
      id: "t-" + index.toString(),
      click: `${index}番目の${text}をクリックした!`,
      style: {
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#000",
        padding: 8,
      },
    },
    text
  );

const container = document.createElement("div");
const input = document.createElement("input");
input.type = "text";
document.body.append(container, input);
let appView = stateToView("");
const initView: View<string> = view(
  {
    title: "",
    themeColor: { r: 0, g: 0, b: 0 },
    language: "English",
  },
  ""
);
const patchState = createPatchState(document, (message: string): void => {
  console.log(message);
});
patchView(createViewDiff(initView, appView), patchState);

input.addEventListener("input", () => {
  const newVNode = stateToView(input.value);
  const diff = createViewDiff(appView, newVNode);
  console.log(view, newVNode, diff);
  patchView(diff, patchState);
  appView = newVNode;
});
