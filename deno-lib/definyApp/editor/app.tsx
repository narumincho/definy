import React from "https://esm.sh/react@18.2.0?pin=v99";
import { jsx } from "https://esm.sh/@emotion/react@11.10.5?pin=v99";
import { Language } from "../../zodType.ts";
import { GoogleLogInButton } from "./components/googleLogInButton.tsx";
import { Clock24 } from "./pages/clock24.tsx";
import { UrlLocation } from "./url.ts";

export type AppProps = {
  readonly language: Language;
  readonly location: UrlLocation | undefined;
  readonly onChangeUrl?: ((newURL: URL) => void) | undefined;
};

export const App = (props: AppProps): React.ReactElement => {
  const [count, setCount] = React.useState<number>(0);
  const [isRequestLogInUrl, setIsRequestLogInUrl] = React.useState<boolean>(
    false,
  );

  if (props.location === undefined) {
    return (
      <div
        css={{
          backgroundColor: "black",
          color: "white",
          height: "100%",
          fontFamily: "Hack",
          display: "grid",
          placeContent: "center",
          fontSize: 32,
        }}
      >
        not found... 見つからなかった
      </div>
    );
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
        <div
          css={{
            backgroundColor: "black",
            color: "white",
            height: "100%",
            fontFamily: "Hack",
            display: "grid",
            gridTemplateRows: "48px 1fr",
          }}
        >
          <div
            css={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#333",
              padding: "0 8px",
            }}
          >
            <div
              css={{ color: "#b9d09b", fontSize: 32, lineHeight: "1" }}
            >
              definy
            </div>
            <div css={{ flexGrow: "1" }}></div>
            <GoogleLogInButton
              language={props.language}
              onClick={() => {
                setIsRequestLogInUrl(true);
              }}
            />
          </div>
          {isRequestLogInUrl && <div>ログインURLをリクエストするAPIを呼ぶ</div>}
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
  }
};
