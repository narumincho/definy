import * as d from "definy-core/source/data";
import {
  AppInterface,
  Message,
  messageSelectDebugPageTab,
} from "./appInterface";
import { FunctionComponent, useState } from "react";
import { c, div, elementMap } from "./view/viewUtil";
import {
  createNoParameterTagEditor,
  createWithParameterSumEditor,
} from "./sumEditor";
import { Element } from "./view/view";
import { Icon } from "./icon";
import { Model } from "./model";
import { OneLineTextInput } from "./oneLineTextInput";
import { UndefinedEditor } from "./undefinedEditor";
import { button } from "./button";
import { createListEditor } from "./listEditor";
import { createProductEditor } from "./productEditor";
import { editorToReactElement } from "./ui";
import { jsx as h } from "@emotion/react";

const tabList = ["Icon", "Product", "Sum", "List"] as const;

export type Tab = typeof tabList[number];

const dummyModel: Model = {} as Model;
const dummyAppInterface: AppInterface = {
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
  outputCode: undefined,
  selectedDebugTab: "Icon",
};

export const view = (appInterface: AppInterface): Element<Message> => {
  return div(
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
        elementMap<Tab, Message>(
          tabView(appInterface.selectedDebugTab),
          (tab) => ({
            tag: messageSelectDebugPageTab,
            tab,
          })
        ),
      ],
      ["content", content(appInterface)],
    ])
  );
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
        selected === tab
          ? div({}, tab)
          : elementMap<undefined, Tab>(button({}, tab), () => tab),
      ])
    )
  );

const content = (appInterface: AppInterface): Element<never> => {
  switch (appInterface.selectedDebugTab) {
    case "Icon":
      return div({}, "Icon");
    case "Product":
      return div({}, "Product");
    case "Sum":
      return div({}, "Sum");
    case "List":
      return div({}, "List");
  }
};

const IconComponent: FunctionComponent<Record<never, never>> = () =>
  h("div", {}, [
    h("div", { key: "requesting-label" }, "Requesting"),
    h(Icon, { key: "requesting-icon", iconType: "Requesting" }),
    h("div", { key: "loading-label" }, "loading"),
    h(Icon, { key: "loading-icon", iconType: "Loading" }),
  ]);

const ProductComponent: FunctionComponent<Record<never, never>> = () => {
  const [state, setState] = useState<SampleType>({
    name: "それな",
    option: { a: "A!", b: "B!" },
  });
  return h(
    "div",
    {},
    editorToReactElement(NameAndDescriptionComponent, {
      value: state,
      onChange: (newValue: SampleType) => setState(newValue),
      name: "product",
      key: "product",
      model: dummyModel,
    })
  );
};

interface SampleType {
  name: string;
  option: {
    a: string;
    b: string;
  };
}

const NameAndDescriptionComponent = createProductEditor<SampleType>(
  {
    name: OneLineTextInput,
    option: createProductEditor(
      {
        a: OneLineTextInput,
        b: OneLineTextInput,
      },
      "ABText"
    ),
  },
  "NameAndOption"
);

type SampleSumType =
  | { _: "WithOneText"; value: string }
  | {
      _: "Product";
      productValue: {
        textA: string;
        textB: string;
      };
    }
  | { _: "Nested"; aOrB: "A" | "B" }
  | { _: "None" };

const SumComponent: FunctionComponent<Record<never, never>> = () => {
  const [state, setState] = useState<SampleSumType>({ _: "None" });

  return editorToReactElement<SampleSumType>(SampleSumComponent, {
    value: state,
    onChange: (newValue: SampleSumType) => setState(newValue),
    name: "sampleSum",
    model: dummyModel,
  });
};

const SampleSumComponent = createWithParameterSumEditor<
  {
    WithOneText: string;
    Product: {
      textA: string;
      textB: string;
    };
    Nested: "A" | "B";
    None: undefined;
  },
  "WithOneText" | "Product" | "Nested" | "None",
  SampleSumType
>(
  {
    WithOneText: OneLineTextInput,
    Product: createProductEditor(
      {
        textA: OneLineTextInput,
        textB: OneLineTextInput,
      },
      "TextAB"
    ),
    Nested: createNoParameterTagEditor(["A", "B"]),
    None: UndefinedEditor,
  },
  {
    WithOneText: { _: "WithOneText", value: "デフォルト値" },
    Product: {
      _: "Product",
      productValue: {
        textA: "textAのデフォルト値",
        textB: "textBのデフォルト値",
      },
    },
    Nested: { _: "Nested", aOrB: "A" },
    None: { _: "None" },
  },
  "SampleSumComponent"
);

const SampleListComponent = createListEditor<ReadonlyArray<string>>({
  isLazy: false,
  editor: createListEditor<string>({
    isLazy: false,
    editor: OneLineTextInput,
    initValue: "初期値",
    displayName: "SampleList",
  }),
  initValue: [],
  displayName: "SampleListList",
});

const ListComponent: FunctionComponent<Record<never, never>> = () => {
  const [state, setState] = useState<ReadonlyArray<ReadonlyArray<string>>>([
    ["それな"],
    ["あれな", "これな"],
  ]);
  return editorToReactElement(SampleListComponent, {
    value: state,
    onChange: (newValue: ReadonlyArray<ReadonlyArray<string>>) =>
      setState(newValue),
    name: "sampleList",
    model: dummyModel,
  });
};
