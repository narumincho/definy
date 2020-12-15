import * as core from "definy-core";
import * as d from "definy-core/source/data";
import * as pageAbout from "./pageAbout";
import * as pageUser from "./pageUser";
import {
  AppInterface,
  Message,
  messageJumpTag,
  messageRequestLogIn,
} from "./appInterface";
import { Element, View } from "./view/view";
import { c, div, view } from "./view/viewUtil";
import { CSSObject } from "@emotion/react";
import { Header } from "./header";
import { keyframes } from "@emotion/css";

export interface State {
  appInterface: AppInterface;
  pageModel: PageModel;
}

export type PageModel =
  | {
      readonly tag: typeof pageModelAboutTag;
    }
  | {
      readonly tag: typeof pageModelUserTag;
      readonly userId: d.UserId;
    };

export const pageModelAboutTag = Symbol("PageModel-About");
export const pageModelUserTag = Symbol("PageModel-User");

export const initState = (
  messageHandler: (message: Message) => void
): State => {
  // ブラウザで戻るボタンを押したときのイベントを登録
  window.addEventListener("popstate", () => {
    const newUrlData: d.UrlData = core.urlDataAndAccountTokenFromUrl(
      new URL(window.location.href)
    ).urlData;
    messageHandler({
      tag: messageJumpTag,
      language: newUrlData.language,
      location: newUrlData.location,
    });
  });

  const urlDataAndAccountToken = core.urlDataAndAccountTokenFromUrl(
    new URL(window.location.href)
  );
  // ブラウザのURLを正規化 アクセストークンを隠す
  window.history.replaceState(
    undefined,
    "",
    core
      .urlDataAndAccountTokenToUrl(
        urlDataAndAccountToken.urlData,
        d.Maybe.Nothing()
      )
      .toString()
  );
  return {
    appInterface: new AppInterface(urlDataAndAccountToken),
    pageModel: locationToInitPageModel(urlDataAndAccountToken.urlData.location),
  };
};

export const updateState = (message: Message, oldState: State): State => {
  switch (message.tag) {
    case messageJumpTag:
      oldState.appInterface.jump(message.location, message.language);
      return {
        pageModel: locationToInitPageModel(message.location),
        appInterface: oldState.appInterface,
      };
    case messageRequestLogIn:
      oldState.appInterface.logIn(
        message.provider,
        pageModelToLocation(oldState.pageModel)
      );
      return oldState;
  }
};

const locationToInitPageModel = (location: d.Location): PageModel => {
  switch (location._) {
    case "About":
      return { tag: pageModelAboutTag };
    case "User":
      return { tag: pageModelUserTag, userId: location.userId };
  }
  return { tag: pageModelAboutTag };
};

const pageModelToLocation = (pageModel: PageModel): d.Location => {
  switch (pageModel.tag) {
    case pageModelAboutTag:
      return d.Location.About;
    case pageModelUserTag:
      return d.Location.User(pageModel.userId);
  }
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

const main = (state: State): Element<Message> => {
  switch (state.pageModel.tag) {
    case pageModelAboutTag:
      return pageAbout.view(state.appInterface);
    case pageModelUserTag:
      return pageUser.view(state.appInterface, state.pageModel.userId);
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
