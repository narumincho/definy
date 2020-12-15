import * as d from "definy-core/source/data";
import * as pageAbout from "./pageAbout";
import { AppInterface, Message } from "./appInterface";
import { Element, View } from "./view/view";
import { State, pageModelAboutTag } from "./state";
import { c, div, view } from "./view/viewUtil";
import { CSSObject } from "@emotion/react";
import { Header } from "./header";
import { Model } from "./model";
import { keyframes } from "@emotion/css";

export const initState = (
  messageHandler: (message: Message) => void
): State => {
  return {
    appInterface: new AppInterface(messageHandler),
    pageModel: { tag: pageModelAboutTag },
  };
};

export const updateState = (message: Message, oldState: State): State => {
  oldState.appInterface.update(message);
  return oldState;
};

export const stateToView = (state: State): View<Message> => {
  const titleAndAttributeChildren = stateToTitleAndAttributeChildren(state);
  return view(
    {
      title: titleAndAttributeChildren.title + " | Definy",
      language: state.appInterface.language,
      themeColor: undefined,
      style: {
        height: "100%",
        display: "grid",
        ...titleAndAttributeChildren.style,
      },
    },
    titleAndAttributeChildren.children
  );
};

const stateToTitleAndAttributeChildren = (
  state: State
): {
  title: string;
  style: CSSObject;
  children: string | ReadonlyMap<string, Element<Message>>;
} => {
  switch (state.appInterface.logInState._) {
    case "RequestingLogInUrl": {
      const message = logInMessage(
        state.appInterface.logInState.openIdConnectProvider,
        state.appInterface.language
      );
      return {
        title: message,
        style: {},
        children: c([["", prepareLogIn(message)]]),
      };
    }
    case "JumpingToLogInPage": {
      const message = jumpMessage(
        new URL(state.appInterface.logInState.string),
        state.appInterface.language
      );
      return {
        title: message,
        style: {},
        children: c([["", prepareLogIn(message)]]),
      };
    }
  }
  return {
    title: "問題ないぜ",
    style: { gridTemplateRows: "48px 1fr" },
    children: c([
      ["header", Header(state.appInterface)],
      ["main", main(state)],
    ]),
  };
};

export interface Props {
  model: Model;
}

const prepareLogIn = (message: string): Element<never> =>
  div(
    {
      style: {
        height: "100%",
        display: "grid",
        alignItems: "center",
        justifyItems: "center",
      },
    },
    c([["", loadingBox(message)]])
  );

const logInMessage = (
  provider: d.OpenIdConnectProvider,
  language: d.Language
): string => {
  switch (language) {
    case "English":
      return `Preparing to log in to ${provider}`;
    case "Esperanto":
      return `Preparante ensaluti al Google${provider}`;
    case "Japanese":
      return `${provider}へのログインを準備中……`;
  }
};

const jumpMessage = (url: URL, language: d.Language): string => {
  switch (language) {
    case "English":
      return `Navigating to ${url}`;
    case "Esperanto":
      return `navigante al ${url}`;
    case "Japanese":
      return `${url}へ移動中……`;
  }
};

const main = (state: State): Element<never> => {
  switch (state.pageModel.tag) {
    case pageModelAboutTag:
      return pageAbout.view(state.appInterface);
  }
};

export const loadingBox = (message: string): Element<never> =>
  div(
    {
      style: {
        display: "grid",
        overflow: "hidden",
        justifyItems: "center",
      },
    },
    c([
      ["message", div({}, message)],
      [
        "logo",
        div(
          {
            style: {
              width: 96,
              height: 96,
              display: "grid",
              justifyItems: "center",
              alignItems: "center",
              borderRadius: "50%",
              animation: `1s ${rotateAnimation} infinite linear`,
              fontSize: 24,
              padding: 8,
              backgroundColor: "#333",
              color: "#ddd",
            },
          },
          "Definy"
        ),
      ],
    ])
  );

const rotateAnimation = keyframes`
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(1turn);
  }
`;
