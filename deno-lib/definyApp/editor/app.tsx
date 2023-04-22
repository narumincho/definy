import React from "https://esm.sh/react@18.2.0?pin=v117";
import { Language } from "../../zodType.ts";
import { createGoogleLogInUrl } from "../apiClient/api/main.ts";
import { GoogleLogInButton } from "./components/googleLogInButton.tsx";
import { Clock24 } from "./pages/clock24.tsx";
import { LogInCallback } from "./pages/logInCallback.tsx";
import { apiUrl, UrlLocation } from "./url.ts";
import { styled } from "https://esm.sh/@stitches/react@1.2.8?pin=v117";

const StyledContainer = styled("div", {
  backgroundColor: "black",
  color: "white",
  height: "100%",
  fontFamily: "Hack",
  display: "grid",
  gridTemplateRows: "48px 1fr",
});

const StyledHeader = styled("div", {
  display: "flex",
  alignItems: "center",
  backgroundColor: "#333",
  padding: "0 8px",
});

const StyledLogo = styled("div", {
  color: "#b9d09b",
  fontSize: 32,
  lineHeight: "1",
});

const Spacer = styled("div", {
  flexGrow: "1",
});

export type AppProps = {
  readonly language: Language;
  readonly location: UrlLocation | undefined;
  readonly onChangeUrl?: ((newURL: URL) => void) | undefined;
};

type LogInState = "noLogIn" | "requestingLogInUrl" | "jumping" | "error";

export const App = (props: AppProps): React.ReactElement => {
  const [count, setCount] = React.useState<number>(0);
  const [isRequestLogInUrl, setIsRequestLogInUrl] = React.useState<LogInState>(
    "noLogIn",
  );

  if (props.location === undefined) {
    return <StyledContainer>not found... 見つからなかった</StyledContainer>;
  }

  switch (props.location.type) {
    case "clock24":
      return (
        <Clock24
          parameter={props.location.parameter}
          onChangeUrl={props.onChangeUrl ?? (() => {})}
        />
      );
    case "top":
      return (
        <StyledContainer>
          <StyledHeader>
            <StyledLogo>definy</StyledLogo>
            <Spacer />
            <GoogleLogInButton
              language={props.language}
              onClick={() => {
                setIsRequestLogInUrl("requestingLogInUrl");
                createGoogleLogInUrl({ url: apiUrl() })
                  .then((response) => {
                    if (response.type === "ok") {
                      setIsRequestLogInUrl("jumping");
                      window.location.href = response.value;
                    } else {
                      setIsRequestLogInUrl("error");
                    }
                  });
              }}
            />
          </StyledHeader>
          {isRequestLogInUrl === "error" && (
            <div>ログインURLの発行に失敗しました</div>
          )}
          {isRequestLogInUrl === "jumping" && (
            <div>
              ログイン画面に推移中...
            </div>
          )}
          {isRequestLogInUrl === "requestingLogInUrl" && (
            <div>ログインURLを発行中...</div>
          )}
          <div>
            <div>{count}</div>
            <button
              onClick={() => {
                setCount((prev) => prev + 1);
              }}
            >
              数値を1増やす
            </button>
          </div>
        </StyledContainer>
      );
    case "logInCallback":
      return <LogInCallback parameter={props.location.parameter} />;
  }
};
