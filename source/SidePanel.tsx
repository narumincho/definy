/** @jsx jsx */

import * as React from "react";
import * as ui from "./ui";
import { Language, OpenIdConnectProvider } from "definy-common/source/data";
import { Model } from "./model";
import { data } from "definy-common";
import { jsx } from "react-free-style";

const sidePanelWidth = 260;

export const SidePanel: React.FC<{
  model: Model;
  onRequestLogIn: (provider: data.OpenIdConnectProvider) => void;
}> = (prop) => (
  <div
    css={{
      width: sidePanelWidth,
      backgroundColor: ui.areaThemeToValue("Gray").backgroundColor,
      height: "100%",
    }}
  >
    <Logo model={prop.model} onJump={prop.model.onJump} />
    {prop.model.logInState._}
    <UserViewOrLogInButton
      model={prop.model}
      requestLogIn={prop.onRequestLogIn}
    />
    <ui.Link
      areaTheme="Gray"
      onJump={prop.model.onJump}
      urlData={{ ...prop.model, location: data.Location.About }}
    >
      <div>About</div>
    </ui.Link>
    <ui.Link
      areaTheme="Gray"
      onJump={prop.model.onJump}
      urlData={{ ...prop.model, location: data.Location.Debug }}
    >
      <div>Debug</div>
    </ui.Link>
  </div>
);

const Logo: React.FC<{
  onJump: (urlData: data.UrlData) => void;
  model: Model;
}> = (prop) => (
  <ui.Link
    areaTheme="Gray"
    css={{ padding: 8 }}
    onJump={prop.onJump}
    urlData={{ ...prop.model, location: data.Location.Home }}
  >
    <div
      css={{
        color: "#b9d09b",
        fontSize: 32,
        lineHeight: 1,
        fontFamily: "Hack",
      }}
    >
      Definy
    </div>
  </ui.Link>
);

const UserViewOrLogInButton: React.FC<{
  model: Model;
  requestLogIn: (provider: data.OpenIdConnectProvider) => void;
}> = (prop) => {
  switch (prop.model.logInState._) {
    case "Guest":
      return (
        <LogInButton
          language={prop.model.language}
          requestLogIn={prop.requestLogIn}
        />
      );
    case "WaitVerifyingAccessToken":
    case "VerifyingAccessToken":
      return <div>アクセストークンを検証中……</div>;
    case "LoggedIn":
      return (
        <div>
          ログイン済み
          {JSON.stringify(
            prop.model.userData.get(prop.model.logInState.userId)
          )}
        </div>
      );
  }
  return <div>ログインの準備中……</div>;
};

const LogInButton: React.FC<{
  requestLogIn: (provider: data.OpenIdConnectProvider) => void;
  language: Language;
}> = (prop) => (
  <div css={{ display: "grid", gap: 8, padding: 8 }}>
    <GoogleButton language={prop.language} requestLogIn={prop.requestLogIn} />
    <GitHubButton language={prop.language} requestLogIn={prop.requestLogIn} />
  </div>
);

const GoogleButton: React.FC<{
  requestLogIn: (provider: data.OpenIdConnectProvider) => void;
  language: Language;
}> = (prop) => (
  <ui.Button
    css={{
      display: "grid",
      gridTemplateColumns: "48px 1fr",
      backgroundColor: "#4285f4",
      borderRadius: 8,
      gap: 8,
      "&:hover": {
        backgroundColor: "#5190f8",
      },
    }}
    onClick={() => {
      prop.requestLogIn("Google");
    }}
  >
    <div
      css={{
        width: 48,
        height: 48,
        padding: 8,
        backgroundColor: "#fff",
        borderRadius: 8,
      }}
    >
      <GoogleIcon />
    </div>
    <div css={{ alignSelf: "center", fontSize: 18, color: "#fff" }}>
      {logInMessage("Google", prop.language)}
    </div>
  </ui.Button>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 20 20">
    <path
      d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
      fill="rgb(66, 133, 244)"
    />
    <path
      d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
      fill="rgb(52, 168, 83)"
    />
    <path
      d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
      fill="rgb(251, 188, 5)"
    />
    <path
      d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
      fill="rgb(234, 67, 53)"
    />
  </svg>
);

const GitHubButton: React.FC<{
  requestLogIn: (provider: data.OpenIdConnectProvider) => void;
  language: Language;
}> = (prop) => (
  <ui.Button
    css={{
      display: "grid",
      gridTemplateColumns: "48px 1fr",
      backgroundColor: "#202020",
      borderRadius: 8,
      gap: 8,
      "&:hover": {
        backgroundColor: "#252525",
      },
    }}
    onClick={() => {
      prop.requestLogIn("GitHub");
    }}
  >
    <div
      css={{
        width: 48,
        height: 48,
        padding: 8,
        backgroundColor: "#fff",
        borderRadius: 8,
      }}
    >
      <ui.GitHubIcon color="#000" />
    </div>
    <div css={{ alignSelf: "center", fontSize: 18, color: "#ddd" }}>
      {logInMessage("GitHub", prop.language)}
    </div>
  </ui.Button>
);

const logInMessage = (
  provider: OpenIdConnectProvider,
  language: Language
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
