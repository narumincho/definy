import * as d from "definy-core/source/data";
import { AppInterface, Message, messageRequestLogInTag } from "./appInterface";
import { c, div, elementMap, path, svg } from "./view/viewUtil";
import { CSSObject } from "@emotion/css";
import { Element } from "./view/view";
import { button } from "./button";
import { gitHubIcon } from "./ui";
import { image } from "./image";
import { link } from "./link";

export const headerView = (appInterface: AppInterface): Element<Message> =>
  div(
    {
      style: {
        display: "grid",
        gridAutoFlow: "column",
        width: "100%",
        backgroundColor: "#333",
        height: 48,
      },
    },
    c([
      ["logo", logo(appInterface)],
      ["settingOrLogInButton", userViewOrLogInButton(appInterface)],
    ])
  );

const logo = (appInterface: AppInterface): Element<Message> =>
  link(
    {
      appInterface,
      location: d.Location.Home,
      theme: "Gray",
      style: {
        justifySelf: "start",
        padding: 8,
        color: "#b9d09b",
        fontSize: 32,
        lineHeight: 1,
        fontFamily: "Hack",
      },
      hoverStyle: {
        color: "#c9e4a6",
      },
    },
    "Definy"
  );

const userViewOrLogInButton = (
  appInterface: AppInterface
): Element<Message> => {
  switch (appInterface.logInState._) {
    case "LoadingAccountTokenFromIndexedDB":
      return div(
        {
          style: userViewOrLogInButtonStyle,
        },
        "アクセストークンをindexedDBから読み取り中……"
      );

    case "Guest":
      return logInButtonList(appInterface.language);
    case "VerifyingAccountToken":
      return div(
        {
          style: userViewOrLogInButtonStyle,
        },
        "アクセストークンを検証中……"
      );

    case "LoggedIn": {
      const userResourceState = appInterface.userMap.get(
        appInterface.logInState.accountTokenAndUserId.userId
      );
      if (userResourceState === undefined || userResourceState._ !== "Loaded") {
        return div(
          {
            style: userViewOrLogInButtonStyle,
          },
          "..."
        );
      }
      return SettingLink({
        appInterface,
        user: userResourceState.dataWithTime.data,
      });
    }
  }
  return div(
    {
      style: userViewOrLogInButtonStyle,
    },
    "ログインの準備中……"
  );
};

const userViewOrLogInButtonStyle: CSSObject = {
  justifySelf: "end",
  alignSelf: "center",
};

const SettingLink = (props: {
  appInterface: AppInterface;
  user: d.User;
}): Element<Message> =>
  link(
    {
      theme: "Gray",
      appInterface: props.appInterface,
      location: d.Location.Setting,
      style: {
        justifySelf: "end",
        display: "grid",
        gridTemplateColumns: "32px auto",
        alignItems: "center",
        padding: 8,
        gap: 8,
      },
    },
    c([
      [
        "icon",
        image({
          imageToken: props.user.imageHash,
          appInterface: props.appInterface,
          alternativeText: "設定",
          width: 32,
          height: 32,
          isCircle: true,
        }),
      ],
      ["name", div({}, props.user.name)],
    ])
  );

const logInButtonList = (language: d.Language): Element<Message> =>
  div(
    {
      style: {
        display: "grid",
        gap: 8,
        padding: 8,
        gridAutoFlow: "column",
        justifySelf: "end",
      },
    },
    c([
      ["google", googleLogInButton(language)],
      ["github", gitHubLogInButton(language)],
    ])
  );

const googleLogInButton = (language: d.Language): Element<Message> =>
  button(
    {
      style: {
        display: "grid",
        gridTemplateColumns: "32px 160px",
        backgroundColor: "#4285f4",
        borderRadius: 8,
        gap: 8,
        padding: 0,
      },
      hoverStyle: {
        backgroundColor: "#5190f8",
      },
      click: {
        tag: messageRequestLogInTag,
        provider: "Google",
      },
    },
    c([
      ["icon", googleIcon],
      [
        "text",
        div(
          {
            style: {
              alignSelf: "center",
              fontSize: 16,
              color: "#fff",
              lineHeight: 1,
            },
          },
          logInMessage("Google", language)
        ),
      ],
    ])
  );

const googleIcon: Element<never> = svg(
  {
    viewBox: { x: 0, y: 0, width: 20, height: 20 },
    style: {
      width: 32,
      height: 32,
      padding: 4,
      backgroundColor: "#fff",
      borderRadius: 8,
    },
  },
  c([
    [
      "blue",
      path({
        d:
          "M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z",
        fill: "rgb(66, 133, 244)",
      }),
    ],
    [
      "green",
      path({
        d:
          "M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z",
        fill: "rgb(52, 168, 83)",
      }),
    ],
    [
      "yellow",
      path({
        d:
          "M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z",
        fill: "rgb(251, 188, 5)",
      }),
    ],
    [
      "red",
      path({
        d:
          "M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z",
        fill: "rgb(234, 67, 53)",
      }),
    ],
  ])
);

const gitHubLogInButton = (language: d.Language): Element<Message> =>
  button(
    {
      style: {
        display: "grid",
        gridTemplateColumns: "32px 160px",
        backgroundColor: "#202020",
        borderRadius: 8,
        gap: 8,
        padding: 0,
      },
      hoverStyle: { backgroundColor: "#252525" },
      click: {
        tag: messageRequestLogInTag,
        provider: "GitHub",
      },
    },
    c([
      [
        "icon",
        gitHubIcon({
          color: "#000",
          width: 32,
          height: 32,
          padding: 4,
          backgroundColor: "#fff",
          borderRadius: 8,
        }),
      ],
      [
        "text",
        div(
          {
            style: {
              alignSelf: "center",
              fontSize: 16,
              lineHeight: 1,
              color: "#ddd",
            },
          },
          logInMessage("GitHub", language)
        ),
      ],
    ])
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
