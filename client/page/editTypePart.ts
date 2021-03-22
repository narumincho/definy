import * as a from "../messageAndState";
import * as d from "../../data";
import * as typePartEditor from "../ui/typePartEditor";
import { box, button, text } from "../ui";
import { c, div } from "@narumincho/html/viewUtil";
import { Element } from "@narumincho/html/view";

export type State = {
  typePartSelection: typePartEditor.Selection;
};

export const init: { state: State; messageList: ReadonlyArray<a.Message> } = {
  messageList: [],
  state: {
    typePartSelection: { tag: "name" },
  },
};

export const view = (
  appState: a.State,
  typePartId: d.TypePartId,
  state: State
): a.TitleAndElement<a.Message> => {
  const typePartState = appState.typePartMap.get(typePartId);
  if (typePartState === undefined) {
    return {
      title: "型パーツ 読み込み準備中",
      element: text("型パーツ 読み込み準備中"),
    };
  }
  switch (typePartState._) {
    case "Deleted":
      return {
        title: "不明な型パーツ",
        element: text("指定した型パーツを見つけることができませんでした"),
      };
    case "Unknown":
      return {
        title: "型パーツの情報を取得できませんでした",
        element: text("型パーツの情報を取得できませんでした"),
      };
    case "Requesting":
      return {
        title: "型パーツ 読込中",
        element: text("型パーツを読込中"),
      };
    case "Loaded":
      return {
        title: "型パーツ 編集",
        element: loaded(
          appState,
          typePartId,
          typePartState.dataWithTime.data,
          state
        ),
      };
  }
};

export const loaded = (
  appState: a.State,
  typePartId: d.TypePartId,
  typePart: d.TypePart,
  state: State
): Element<a.Message> => {
  return div<a.Message>(
    {
      style: {
        overflowY: "scroll",
        width: "100%",
        padding: 4,
      },
    },
    c([
      [
        "e",
        typePartEditor.view(
          appState,
          typePartId,
          state.typePartSelection,
          (typePartEditorMessage) => ({ tag: a.messageNoOp })
        ),
      ],
      [
        "saveButton",
        appState.typePartEditState === "None"
          ? button<a.Message>(
              { click: { tag: "SaveTypePart", typePartId } },
              "この型パーツのみ保存"
            )
          : text("処理中"),
      ],
    ])
  );
};
