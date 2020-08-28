import * as React from "react";
import * as ui from "./ui";
import {
  Language,
  Location,
  OpenIdConnectProvider,
  UrlData,
} from "definy-core/source/data";
import { Model } from "./model";
import styled from "styled-components";

const HeaderDiv = styled.div({
  display: "grid",
  gridAutoFlow: "column",
  width: "100%",
  backgroundColor: "#333",
  height: 48,
});

const LogoLink = styled(ui.Link)({
  justifySelf: "start",
  padding: 8,
  color: "#b9d09b",
  fontSize: 32,
  lineHeight: 1,
  fontFamily: "Hack",
  "&:hover": {
    color: "#b9d09b",
  },
});

export const Header: React.FC<{
  model: Model;
}> = (prop) => (
  <HeaderDiv>
    <Logo model={prop.model} onJump={prop.model.onJump} />
    <UserViewOrLogInButton model={prop.model} />
  </HeaderDiv>
);

const Logo: React.FC<{
  onJump: (urlData: UrlData) => void;
  model: Model;
}> = (prop) => (
  <LogoLink
    areaTheme="Gray"
    onJump={prop.onJump}
    urlData={{ ...prop.model, location: Location.Home }}
  >
    Definy
  </LogoLink>
);

const UserViewOrLogInButton: React.FC<{
  model: Model;
}> = (prop) => {
  switch (prop.model.logInState._) {
    case "WaitLoadingAccessTokenFromIndexedDB":
      return (
        <UserViewDiv>アクセストークンをindexedDBから読み取り中</UserViewDiv>
      );
    case "LoadingAccessTokenFromIndexedDB":
      return (
        <UserViewDiv>アクセストークンをindexedDBから読み取り中……</UserViewDiv>
      );
    case "Guest":
      return (
        <LogInButton
          language={prop.model.language}
          requestLogIn={prop.model.requestLogIn}
        />
      );
    case "WaitVerifyingAccessToken":
      return <UserViewDiv>アクセストークンを検証中</UserViewDiv>;
    case "VerifyingAccessToken":
      return <UserViewDiv>アクセストークンを検証中……</UserViewDiv>;
    case "LoggedIn": {
      const userResourceState = prop.model.userMap.get(
        prop.model.logInState.accessTokenAndUserId.userId
      );
      if (
        userResourceState === undefined ||
        userResourceState._ !== "Loaded" ||
        userResourceState.dataResource.dataMaybe._ === "Nothing"
      ) {
        return <UserViewDiv>...</UserViewDiv>;
      }
      const user = userResourceState.dataResource.dataMaybe.value;
      return (
        <SettingLink
          areaTheme="Gray"
          onJump={prop.model.onJump}
          urlData={{ ...prop.model, location: Location.Setting }}
        >
          <ui.Image
            imageStyle={{
              width: 32,
              height: 32,
              padding: 0,
              round: true,
            }}
            imageToken={user.imageHash}
            model={prop.model}
          />
          {user.name}
        </SettingLink>
      );
    }
  }
  return <UserViewDiv>ログインの準備中……</UserViewDiv>;
};

const UserViewDiv = styled.div({
  justifySelf: "end",
});

const SettingLink = styled(ui.Link)({
  justifySelf: "end",
  display: "grid",
  gridTemplateColumns: "32px auto",
  alignItems: "center",
  padding: 8,
});

const LogInButtonDiv = styled.div({
  display: "grid",
  gap: 8,
  padding: 8,
  gridAutoFlow: "column",
  justifySelf: "end",
});

const LogInButton: React.FC<{
  requestLogIn: (provider: OpenIdConnectProvider) => void;
  language: Language;
}> = (prop) => (
  <LogInButtonDiv>
    <GoogleButton language={prop.language} requestLogIn={prop.requestLogIn} />
    <GitHubButton language={prop.language} requestLogIn={prop.requestLogIn} />
  </LogInButtonDiv>
);

const StyledGoogleButton = styled(ui.Button)({
  display: "grid",
  gridTemplateColumns: "32px 160px",
  backgroundColor: "#4285f4",
  borderRadius: 8,
  gap: 8,
  "&:hover": {
    backgroundColor: "#5190f8",
  },
});

const GoogleButton: React.FC<{
  requestLogIn: (provider: OpenIdConnectProvider) => void;
  language: Language;
}> = (prop) => (
  <StyledGoogleButton
    onClick={() => {
      prop.requestLogIn("Google");
    }}
  >
    <GoogleIconContainer>
      <GoogleIcon />
    </GoogleIconContainer>
    <GoogleLogInMessageDiv>
      {logInMessage("Google", prop.language)}
    </GoogleLogInMessageDiv>
  </StyledGoogleButton>
);

const GoogleIconContainer = styled.div({
  width: 32,
  height: 32,
  padding: 4,
  backgroundColor: "#fff",
  borderRadius: 8,
});

const GoogleLogInMessageDiv = styled.div({
  alignSelf: "center",
  fontSize: 18,
  color: "#fff",
});

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

const StyledGitHubButton = styled(ui.Button)({
  display: "grid",
  gridTemplateColumns: "32px 160px",
  backgroundColor: "#202020",
  borderRadius: 8,
  gap: 8,
  "&:hover": {
    backgroundColor: "#252525",
  },
});

const GitHubButton: React.FC<{
  requestLogIn: (provider: OpenIdConnectProvider) => void;
  language: Language;
}> = (prop) => (
  <StyledGitHubButton
    onClick={() => {
      prop.requestLogIn("GitHub");
    }}
  >
    <GitHubIconContainer>
      <ui.GitHubIcon color="#000" />
    </GitHubIconContainer>
    <GitHubLogInMessageDiv>
      {logInMessage("GitHub", prop.language)}
    </GitHubLogInMessageDiv>
  </StyledGitHubButton>
);

const GitHubIconContainer = styled.div({
  width: 32,
  height: 32,
  padding: 4,
  backgroundColor: "#fff",
  borderRadius: 8,
});

const GitHubLogInMessageDiv = styled.div({
  alignSelf: "center",
  fontSize: 18,
  color: "#ddd",
});

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
