import * as d from "definy-core/source/data";
import { css, jsx as h } from "@emotion/react";
import { Button } from "./button";
import { FunctionComponent } from "react";
import { GitHubIcon } from "./gitHubIcon";
import { Image } from "./image";
import { Link } from "./link";
import { Model } from "./model";

export const Header: FunctionComponent<{ model: Model }> = (props) =>
  h(
    "div",
    {
      css: css({
        display: "grid",
        gridAutoFlow: "column",
        width: "100%",
        backgroundColor: "#333",
        height: 48,
      }),
    },
    [
      h(Logo, { model: props.model, key: "logo" }),
      h(UserViewOrLogInButton, { model: props.model, key: "user" }),
    ]
  );

const Logo: FunctionComponent<{ model: Model }> = (props) =>
  h(
    Link,
    {
      model: props.model,
      location: d.Location.Home,
      theme: "Gray",
      css: css({
        justifySelf: "start",
        padding: 8,
        color: "#b9d09b",
        fontSize: 32,
        lineHeight: 1,
        fontFamily: "Hack",
        "&:hover": {
          color: "#c9e4a6",
        },
      }),
    },
    ["Definy"]
  );

const UserViewOrLogInButton: FunctionComponent<{
  model: Model;
}> = (props) => {
  return h(
    "div",
    {
      css: css({
        justifySelf: "end",
        alignSelf: "center",
      }),
    },
    (() => {
      switch (props.model.logInState._) {
        case "LoadingAccountTokenFromIndexedDB":
          return "アクセストークンをindexedDBから読み取り中……";

        case "Guest":
          return h(LogInButtonList, {
            language: props.model.language,
            requestLogIn: props.model.logIn,
          });
        case "VerifyingAccountToken":
          return "アクセストークンを検証中……";

        case "LoggedIn": {
          const userResourceState = props.model.userMap.get(
            props.model.logInState.accountTokenAndUserId.userId
          );
          if (
            userResourceState === undefined ||
            userResourceState._ !== "Loaded"
          ) {
            return "...";
          }
          const user = userResourceState.dataWithTime.data;
          return h(
            Link,
            {
              theme: "Gray",
              model: props.model,
              location: d.Location.Setting,
              css: css({
                justifySelf: "end",
                display: "grid",
                gridTemplateColumns: "32px auto",
                alignItems: "center",
                padding: 8,
              }),
            },
            h(Image, {
              imageToken: user.imageHash,
              model: props.model,
              alternativeText: "設定",
              css: css({
                borderRadius: "50%",
              }),
            }),
            user.name
          );
        }
      }
      return "ログインの準備中……";
    })()
  );
};

const LogInButtonList: FunctionComponent<{
  requestLogIn: (provider: d.OpenIdConnectProvider) => void;
  language: d.Language;
}> = (prop) =>
  h(
    "div",
    {
      css: css({
        display: "grid",
        gap: 8,
        padding: 8,
        gridAutoFlow: "column",
        justifySelf: "end",
      }),
    },
    [
      h(GoogleLogInButton, { ...prop, key: "google" }),
      h(GitHubLogInButton, { ...prop, key: "github" }),
    ]
  );

const GoogleLogInButton: FunctionComponent<{
  requestLogIn: (provider: d.OpenIdConnectProvider) => void;
  language: d.Language;
}> = (prop) =>
  h(
    Button,
    {
      onClick: () => {
        prop.requestLogIn("Google");
      },
      css: css({
        display: "grid",
        gridTemplateColumns: "32px 160px",
        backgroundColor: "#4285f4",
        borderRadius: 8,
        gap: 8,
        padding: 0,
        "$:hover": {
          backgroundColor: "#5190f8",
        },
      }),
    },
    [
      h(GoogleIcon, { key: "icon" }),
      h(
        "div",
        {
          key: "text",
          css: css({
            alignSelf: "center",
            fontSize: 18,
            color: "#fff",
          }),
        },
        logInMessage("Google", prop.language)
      ),
    ]
  );

const GoogleIcon: FunctionComponent<Record<never, never>> = () =>
  h(
    "svg",
    {
      viewBox: "0 0 20 20",
      css: css({
        width: 32,
        height: 32,
        padding: 4,
        backgroundColor: "#fff",
        borderRadius: 8,
      }),
    },
    [
      h("path", {
        d:
          "M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z",
        fill: "rgb(66, 133, 244)",
        key: "blue",
      }),
      h("path", {
        d:
          "M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z",
        fill: "rgb(52, 168, 83)",
        key: "green",
      }),
      h("path", {
        d:
          "M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z",
        fill: "rgb(251, 188, 5)",
        key: "yellow",
      }),
      h("path", {
        d:
          "M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z",
        fill: "rgb(234, 67, 53)",
        key: "red",
      }),
    ]
  );

const GitHubLogInButton: FunctionComponent<{
  requestLogIn: (provider: d.OpenIdConnectProvider) => void;
  language: d.Language;
}> = (prop) =>
  h(
    Button,
    {
      onClick: () => {
        prop.requestLogIn("GitHub");
      },
      css: css({
        display: "grid",
        gridTemplateColumns: "32px 160px",
        backgroundColor: "#202020",
        borderRadius: 8,
        gap: 8,
        padding: 0,
        "$:hover": {
          backgroundColor: "#252525",
        },
      }),
    },
    [
      h(GitHubIcon, {
        color: "#000",
        key: "icon",
        css: css({
          width: 32,
          height: 32,
          padding: 4,
          backgroundColor: "#fff",
          borderRadius: 8,
        }),
      }),
      h(
        "div",
        {
          key: "text",
          css: css({
            alignSelf: "center",
            fontSize: 18,
            color: "#ddd",
          }),
        },
        logInMessage("GitHub", prop.language)
      ),
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
