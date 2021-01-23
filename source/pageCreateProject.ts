import { TitleAndElement } from "./messageAndState";
import { div } from "./view/viewUtil";

export const view = (): TitleAndElement => {
  return {
    title: "プロジェクトの作成",
    element: div({}, "プロジェクトを作成する画面!"),
  };
};
