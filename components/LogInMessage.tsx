import * as React from "react";
import * as d from "../localData";
import { css, keyframes } from "@emotion/css";

export const LogInMessage = (props: {
  readonly logInState: d.LogInState;
  readonly language: d.Language;
}): React.ReactElement => {
  switch (props.logInState._) {
    case "RequestingLogInUrl": {
      return (
        <PrepareLogIn
          message={logInMessage(
            props.logInState.openIdConnectProvider,
            props.language
          )}
        />
      );
    }
    case "JumpingToLogInPage": {
      return <PrepareLogIn message={jumpMessage(props.language)} />;
    }
  }
  return <></>;
};

const PrepareLogIn: React.FC<{ message: string }> = (props) => (
  <div
    className={css({
      height: "100%",
      display: "grid",
      alignItems: "center",
      justifyItems: "center",
    })}
  >
    <LoadingBox message={props.message} />
  </div>
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

const jumpMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return `Navigating to Google logIn page.`;
    case "Esperanto":
      return `Navigado al Google-ensaluta paĝo.`;
    case "Japanese":
      return `Google のログインページへ移動中……`;
  }
};

const LoadingBox: React.FC<{ message: string }> = (props) => (
  <div
    className={css({
      display: "grid",
      overflow: "hidden",
      justifyItems: "center",
    })}
  >
    <div>{props.message}</div>
    <div
      className={css({
        width: 128,
        height: 128,
        display: "grid",
        justifyItems: "center",
        alignItems: "center",
        borderRadius: "50%",
        animation: `3s ${rotateAnimation} infinite linear`,
        fontSize: 24,
        padding: 8,
        backgroundColor: "#333",
        color: "#ddd",
      })}
    >
      definy
    </div>
  </div>
);

const rotateAnimation = keyframes`
    0% {
      transform: rotate(0);
    }
    100% {
      transform: rotate(1turn);
    }
  `;
