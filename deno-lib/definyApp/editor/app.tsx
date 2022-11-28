import React from "https://esm.sh/react@18.2.0?pin=v99";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";
import { Language } from "../../zodType.ts";
import { createGoogleLogInUrl } from "../apiClient/definyApi.ts";
import { GoogleLogInButton } from "./components/googleLogInButton.tsx";
import { Clock24 } from "./pages/clock24.tsx";
import { LogInCallback } from "./pages/logInCallback.tsx";
import { UrlLocation } from "./url.ts";

const containerStyle = toStyleAndHash({
  backgroundColor: "black",
  color: "white",
  height: "100%",
  fontFamily: "Hack",
  display: "grid",
  gridTemplateRows: "48px 1fr",
});

const headerStyle = toStyleAndHash({
  display: "flex",
  alignItems: "center",
  backgroundColor: "#333",
  padding: "0 8px",
});

const logoStyle = toStyleAndHash({
  color: "#b9d09b",
  fontSize: 32,
  lineHeight: "1",
});

const spacer = toStyleAndHash({
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
    return <div className={c(containerStyle)}>not found... 見つからなかった</div>;
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
        <div className={c(containerStyle)}>
          <div className={c(headerStyle)}>
            <div className={c(logoStyle)}>definy</div>
            <div className={c(spacer)}></div>
            <GoogleLogInButton
              language={props.language}
              onClick={() => {
                setIsRequestLogInUrl("requestingLogInUrl");
                createGoogleLogInUrl({ url: new URL(location.href).origin })
                  .then((response) => {
                    if (response.type === "ok") {
                      setIsRequestLogInUrl("jumping");
                      window.location.href = response.ok;
                    } else {
                      setIsRequestLogInUrl("error");
                    }
                  });
              }}
            />
          </div>
          {isRequestLogInUrl === "error" && <div>ログインURLの発行に失敗しました</div>}
          {isRequestLogInUrl === "jumping" && <div>ログイン画面に推移中...</div>}
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
        </div>
      );
    case "logInCallback":
      return <LogInCallback parameter={props.location.parameter} />;
  }
};
