import * as d from "definy-core/source/data";
import {
  Message,
  State,
  TitleAndElement,
  messageSelectDebugPageTab,
} from "./messageAndState";
import { c, div, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
import { button } from "./button";
import { icon } from "./icon";

const tabList = ["Icon", "Product", "Sum", "List"] as const;

export type Tab = typeof tabList[number];

export const init: Tab = "Icon";

const dummyAppInterface: State = {
  top50ProjectIdState: { _: "None" },
  projectMap: new Map(),
  userMap: new Map(),
  imageMap: new Map(),
  typePartMap: new Map(),
  isCreatingProject: false,
  typePartEditState: "None",
  getTypePartInProjectState: { _: "None" },
  language: d.Language.English,
  clientMode: "DebugMode",
  logInState: d.LogInState.Guest,
  outputCode: { tag: "notGenerated" },
  pageModel: {
    tag: "Debug",
    tab: init,
  },
};

export const view = (
  appInterface: State,
  selectedTab: Tab
): TitleAndElement => {
  return {
    title: "デバッグ",
    element: div(
      {
        style: {
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          width: "100%",
        },
      },
      c([
        [
          "tab",
          elementMap<Tab, Message>(tabView(selectedTab), (tab) => ({
            tag: messageSelectDebugPageTab,
            tab,
          })),
        ],
        ["content", content(appInterface, selectedTab)],
      ])
    ),
  };
};

const tabView = (selected: Tab): Element<Tab> =>
  div(
    {
      style: {
        display: "grid",
        alignContent: "start",
      },
    },
    c(
      tabList.map((tab): readonly [string, Element<Tab>] => [
        tab,
        selected === tab ? div({}, tab) : button({ click: tab }, tab),
      ])
    )
  );

const content = (appInterface: State, selectedTab: Tab): Element<never> => {
  switch (selectedTab) {
    case "Icon":
      return iconView;
    case "Product":
      return div({}, "Product");
    case "Sum":
      return div({}, "Sum");
    case "List":
      return div({}, "List");
  }
};

const iconView: Element<never> = div(
  {},
  c([
    ["requesting-label", div({}, "Requesting")],
    ["requesting-icon", icon("Requesting")],
    ["loading-label", div({}, "Loading")],
    ["loading-icon", icon("Loading")],
  ])
);
