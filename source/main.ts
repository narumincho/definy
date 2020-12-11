import * as d from "definy-core/source/data";
import { createPatchState, domToView, patchView } from "./view/patch";
import { View } from "./view/view";
import { createViewDiff } from "./view/diff";
import { view } from "./view/viewUtil";

const initView = domToView();
if (initView._ === "Error") {
  console.error("DOMの初期状態を解釈できなかった", initView.error);
  throw new Error("DOMの初期状態を解釈できなかった");
}
const appView: View<never> = view(
  {
    title: "Definy!",
    language: d.Language.Japanese,
    themeColor: undefined,
  },
  "やあ"
);
const diff = createViewDiff(initView.ok, appView);
console.log("view diff", initView, appView, diff);
const patchState = createPatchState(() => {});
patchView(diff, patchState);
