import * as d from "definy-core/source/data";
import { FunctionComponent, createElement as h } from "react";
import { GitHubIcon } from "./gitHubIcon";
import { Image } from "./image";
import { Link } from "./link";
import { Model } from "./model";
import styled from "styled-components";

export const Header: FunctionComponent<{ model: Model }> = (props) =>
  h(StyledHeader, {}, [
    h(Logo, { model: props.model, key: "logo" }),
    h(UserViewOrLogInButton, { model: props.model, key: "user" }),
  ]);

export const StyledHeader = styled.div({
  display: "grid",
  gridAutoFlow: "column",
  width: "100%",
  backgroundColor: "#333",
  height: 48,
});

const Logo: FunctionComponent<{ model: Model }> = (props) =>
  h(
    StyledLogo,
    {
      model: props.model,
      location: d.Location.Home,
      theme: "Gray",
    },
    ["Definy"]
  );

const StyledLogo = styled(Link)({
  justifySelf: "start",
  padding: 8,
  color: "#b9d09b",
  fontSize: 32,
  lineHeight: 1,
  fontFamily: "Hack",
  "&:hover": {
    color: "#c9e4a6",
  },
});

const UserViewOrLogInButton: FunctionComponent<{
  model: Model;
}> = (props) => {
  switch (props.model.logInState._) {
    case "WaitLoadingAccountTokenFromIndexedDB":
      return h(StyledUserViewOrLogInButton, {}, [
        "アクセストークンをindexedDBから読み取り中",
      ]);
    case "LoadingAccountTokenFromIndexedDB":
      return h(StyledUserViewOrLogInButton, {}, [
        "アクセストークンをindexedDBから読み取り中……",
      ]);
    case "Guest":
      return LogInButtonList({
        language: props.model.language,
        requestLogIn: props.model.logIn,
      });
    case "WaitVerifyingAccountToken":
      return h(StyledUserViewOrLogInButton, {}, "アクセストークンを検証中");
    case "VerifyingAccountToken":
      return h(StyledUserViewOrLogInButton, {}, "アクセストークンを検証中……");
    case "LoggedIn": {
      const userResourceState = props.model.userMap.get(
        props.model.logInState.accountTokenAndUserId.userId
      );
      if (
        userResourceState === undefined ||
        userResourceState._ !== "Loaded" ||
        userResourceState.dataResource.dataMaybe._ === "Nothing"
      ) {
        return h(StyledUserViewOrLogInButton, {}, "...");
      }
      const user = userResourceState.dataResource.dataMaybe.value;
      return h(
        SettingLink,
        {
          theme: "Gray",
          model: props.model,
          location: d.Location.Setting,
        },
        h(UserIcon, {
          imageToken: user.imageHash,
          model: props.model,
          alternativeText: "設定",
        }),
        user.name
      );
    }
  }
  return h(StyledUserViewOrLogInButton, {}, "ログインの準備中……");
};

const StyledUserViewOrLogInButton = styled.div({
  justifySelf: "end",
  alignSelf: "center",
});

const SettingLink = styled(Link)({
  justifySelf: "end",
  display: "grid",
  gridTemplateColumns: "32px auto",
  alignItems: "center",
  padding: 8,
});

const UserIcon = styled(Image)({
  borderRadius: "50%",
});

const LogInButtonList: FunctionComponent<{
  requestLogIn: (provider: d.OpenIdConnectProvider) => void;
  language: d.Language;
}> = (prop) =>
  h(StyledLogInButtonList, {}, [
    h(GoogleLogInButton, { ...prop, key: "google" }),
    h(GitHubLogInButton, { ...prop, key: "github" }),
  ]);

const StyledLogInButtonList = styled.div({
  display: "grid",
  gap: 8,
  padding: 8,
  gridAutoFlow: "column",
  justifySelf: "end",
});

const GoogleLogInButton: FunctionComponent<{
  requestLogIn: (provider: d.OpenIdConnectProvider) => void;
  language: d.Language;
}> = (prop) =>
  h(
    StyledGoogleLogInButton,
    {
      onClick: () => {
        prop.requestLogIn("Google");
      },
    },
    [
      h(GoogleIcon),
      h(GoogleLogInButtonText, {}, logInMessage("Google", prop.language)),
    ]
  );

const StyledGoogleLogInButton = styled.button({
  display: "grid",
  gridTemplateColumns: "32px 160px",
  backgroundColor: "#4285f4",
  borderRadius: 8,
  gap: 8,
  padding: 0,
  "$:hover": {
    backgroundColor: "#5190f8",
  },
});

const GoogleIcon: FunctionComponent<never> = () =>
  h(StyledGoogleIcon, { viewBox: "0 0 20 20" }, [
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

const StyledGoogleIcon = styled.svg({
  width: 32,
  height: 32,
  padding: 4,
  backgroundColor: "#fff",
  borderRadius: 8,
});

const GoogleLogInButtonText = styled.div({
  alignSelf: "center",
  fontSize: 18,
  color: "#fff",
});

const GitHubLogInButton: FunctionComponent<{
  requestLogIn: (provider: d.OpenIdConnectProvider) => void;
  language: d.Language;
}> = (prop) =>
  h(
    StyledGitHubLogInButton,
    {
      onClick: () => {
        prop.requestLogIn("GitHub");
      },
    },
    [
      h(GitHubLogInButtonIcon, { color: "#000" }),
      h(GitHubLogInButtonText, {}, logInMessage("GitHub", prop.language)),
    ]
  );

const StyledGitHubLogInButton = styled.button({
  display: "grid",
  gridTemplateColumns: "32px 160px",
  backgroundColor: "#202020",
  borderRadius: 8,
  gap: 8,
  padding: 0,
  "$:hover": {
    backgroundColor: "#252525",
  },
});

const GitHubLogInButtonIcon = styled(GitHubIcon)({
  width: 32,
  height: 32,
  padding: 4,
  backgroundColor: "#fff",
  borderRadius: 8,
});

const GitHubLogInButtonText = styled.div({
  alignSelf: "center",
  fontSize: 18,
  color: "#ddd",
});

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
