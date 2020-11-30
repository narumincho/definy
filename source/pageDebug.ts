import {
  Component,
  FunctionComponent,
  ReactElement,
  createElement as h,
  useState,
} from "react";
import {
  createNoParameterTagEditor,
  createWithParameterSumEditor,
} from "./sumEditor";
import { Button } from "./button";
import { Icon } from "./icon";
import { Model } from "./model";
import { OneLineTextInput } from "./oneLineTextInput";
import { UndefinedEditor } from "./undefinedEditor";
import { createListEditor } from "./listEditor";
import { createProductEditor } from "./productEditor";
import { editorToReactElement } from "./ui";
import styled from "styled-components";

const tabList = ["Icon", "Product", "Sum", "List"] as const;

type Tab = typeof tabList[number];

type Props = Record<never, never>;

type State = {
  tab: Tab;
};

const dummyModel: Model = {} as Model;

export class PageDebug extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { tab: "Icon" };
  }

  render(): ReactElement {
    return h(StyledPageDebug, {}, [
      h(
        TabList,
        { key: "tab" },
        tabList.map((tab) =>
          this.state.tab === tab
            ? h("div", { key: tab }, tab)
            : h(
                Button,
                {
                  key: tab,
                  onClick: () => {
                    this.setState({ tab });
                  },
                },
                tab
              )
        )
      ),
      h("div", { key: "content" }, h(Content, { tab: this.state.tab })),
    ]);
  }
}

const TabList = styled.div({
  display: "grid",
  alignContent: "start",
});

const StyledPageDebug = styled.div({
  display: "grid",
  gridTemplateColumns: "200px 1fr",
  width: "100%",
});

const Content: FunctionComponent<{ tab: Tab }> = (props) => {
  switch (props.tab) {
    case "Icon":
      return h(IconComponent, {});
    case "Product":
      return h(ProductComponent, {});
    case "Sum":
      return h(SumComponent, {});
    case "List":
      return h(ListComponent, {});
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

type SampleType = {
  name: string;
  option: {
    a: string;
    b: string;
  };
};

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
