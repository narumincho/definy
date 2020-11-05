import * as d from "definy-core/source/data";
import * as ui from "./ui";
import { FunctionComponent, VNode, h } from "preact";
import { Link } from "./Link";
import { ModelInterface } from "./model";

export const Header: FunctionComponent<{ modelInterface: ModelInterface }> = (
  props
): VNode =>
  h("div", { class: "header__root", key: "header" }, [
    h(Logo, { modelInterface: props.modelInterface, key: "logo" }),
    h(UserViewOrLogInButton, { modelInterface: props.modelInterface }),
  ]);

const Logo: FunctionComponent<{ modelInterface: ModelInterface }> = (props) =>
  h(
    Link,
    {
      props,
      location: d.Location.Home,
      areaTheme: "Gray",
      class: "header__logo",
    },
    ["Definy"]
  );

const UserViewOrLogInButton: FunctionComponent<{
  modelInterface: ModelInterface;
}> = (props): VNode => {
  switch (props.modelInterface.logInState._) {
    case "WaitLoadingAccountTokenFromIndexedDB":
      return h("div", { class: "header__login" }, [
        "アクセストークンをindexedDBから読み取り中",
      ]);
    case "LoadingAccountTokenFromIndexedDB":
      return h("div", { class: "header__login" }, [
        "アクセストークンをindexedDBから読み取り中……",
      ]);
    case "Guest":
      return LogInButton({
        language: props.modelInterface.language,
        requestLogIn: props.modelInterface.logIn,
      });
    case "WaitVerifyingAccountToken":
      return h("div", { class: "header__login" }, ["アクセストークンを検証中"]);
    case "VerifyingAccountToken":
      return h("div", { class: "header__login" }, [
        "アクセストークンを検証中……",
      ]);
    case "LoggedIn": {
      const userResourceState = props.modelInterface.userMap.get(
        props.modelInterface.logInState.accountTokenAndUserId.userId
      );
      if (
        userResourceState === undefined ||
        userResourceState._ !== "Loaded" ||
        userResourceState.dataResource.dataMaybe._ === "Nothing"
      ) {
        return h("div", { class: "header__login" }, ["..."]);
      }
      const user = userResourceState.dataResource.dataMaybe.value;
      return h(
        Link,
        {
          class: "header__setting-link",
          areaTheme: "Gray",
          modelInterface: props.modelInterface,
          location: d.Location.Setting,
        },
        [
          ui.image({
            class: "header__setting-link",
            imageToken: user.imageHash,
            modelInterface: props.modelInterface,
            key: "logo",
          }),
          user.name,
        ]
      );
    }
  }
  return h("div", { class: "header__login" }, ["ログインの準備中……"]);
};

const LogInButton = (prop: {
  requestLogIn: (provider: d.OpenIdConnectProvider) => void;
  language: d.Language;
}): VNode =>
  h("div", { class: "header__login-button-list" }, [
    googleButton(prop),
    gitHubButton(prop),
  ]);

const googleButton = (prop: {
  requestLogIn: (provider: d.OpenIdConnectProvider) => void;
  language: d.Language;
}): VNode =>
  h(
    "button",
    {
      class: "header__google-button",
      onclick: () => {
        prop.requestLogIn("Google");
      },
    },
    [
      h("div", { class: "header__google-icon" }, [googleIcon]),
      h("div", { class: "header__google-text" }, [
        logInMessage("Google", prop.language),
      ]),
    ]
  );

const googleIcon: VNode = h("svg", { viewBox: "0 0 20 20" }, [
  h("path", {
    d:
      "M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z",
    fill: "rgb(66, 133, 244)",
  }),
  h("path", {
    d:
      "M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z",
    fill: "rgb(52, 168, 83)",
  }),
  h("path", {
    d:
      "M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z",
    fill: "rgb(251, 188, 5)",
  }),
  h("path", {
    d:
      "M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z",
    fill: "rgb(234, 67, 53)",
  }),
]);

const gitHubButton = (prop: {
  requestLogIn: (provider: d.OpenIdConnectProvider) => void;
  language: d.Language;
}): VNode =>
  h(
    "button",
    {
      class: "header__github-button",
      onclick: () => {
        prop.requestLogIn("GitHub");
      },
    },
    [
      ui.gitHubIcon({ color: "#000", class: "header__github-icon" }),
      h("div", { class: "header__github-text" }, [
        logInMessage("GitHub", prop.language),
      ]),
    ]
  );

const logInMessage = (
  provider: d.OpenIdConnectProvider,
  language: d.Language
): string => {
  switch (language) {
    case "English":
      return `Sign in with ${provider}`;
    case "Esperanto":
      return `Ensalutu kun ${provider}`;
    case "Japanese":
      return `${provider}でログイン`;
  }
};