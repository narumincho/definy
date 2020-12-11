import * as core from "definy-core";
import * as d from "definy-core/source/data";
import * as pageAbout from "./pageAbout";
import { Element, View } from "./view/view";
import { Message, State } from "./state";
import { c, div, view } from "./view/viewUtil";
import { CSSObject } from "@emotion/react";
import { Model } from "./model";
import { keyframes } from "@emotion/css";

export const initState = (
  messageHandler: (message: Message) => void
): State => {
  const urlDataAndAccountToken = core.urlDataAndAccountTokenFromUrl(
    new URL(window.location.href)
  );

  // ブラウザで戻るボタンを押したときのイベントを登録
  window.addEventListener("popstate", () => {
    const newUrlData: d.UrlData = core.urlDataAndAccountTokenFromUrl(
      new URL(window.location.href)
    ).urlData;
    messageHandler({
      tag: "setUrlData",
      language: newUrlData.language,
      clientMode: newUrlData.clientMode,
      location: newUrlData.location,
    });
  });

  return {
    logInState:
      urlDataAndAccountToken.accountToken._ === "Just"
        ? d.LogInState.VerifyingAccountToken(
            urlDataAndAccountToken.accountToken.value
          )
        : d.LogInState.LoadingAccountTokenFromIndexedDB,
    language: urlDataAndAccountToken.urlData.language,
    clientMode: urlDataAndAccountToken.urlData.clientMode,
    pageModel: { tag: "About" },
  };
};

export const updateState = (message: Message, oldState: State): State => {
  switch (message.tag) {
    case "setUrlData":
      return {
        ...oldState,
        language: message.language,
        clientMode: message.clientMode,
      };
  }
};

export const stateToView = (state: State): View<Message> => {
  const titleAndAttributeChildren = stateToTitleAndAttributeChildren(state);
  return view(
    {
      title: titleAndAttributeChildren.title + " | Definy",
      language: state.language,
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
  switch (state.logInState._) {
    case "RequestingLogInUrl": {
      const message = logInMessage(
        state.logInState.openIdConnectProvider,
        state.language
      );
      return {
        title: message,
        style: {},
        children: c([["", prepareLogIn(message)]]),
      };
    }
    case "JumpingToLogInPage": {
      const message = jumpMessage(
        new URL(state.logInState.string),
        state.language
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
      ["header", div({}, "ヘッダー")],
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
    case "About":
      return pageAbout.view(state);
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
