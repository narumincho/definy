import React from "https://esm.sh/react@18.2.0?pin=v99";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";
import { Language } from "../../zodType.ts";
import { GoogleLogInButton } from "./components/googleLogInButton.tsx";
import { Clock24 } from "./pages/clock24.tsx";

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

type AppProps = {
  readonly language: Language;
  readonly message: string;
  readonly date: Date | undefined;
  readonly isClock24: boolean;
  readonly onChangeUrl?: ((newURL: URL) => void) | undefined;
};

export const App = (props: AppProps): React.ReactElement => {
  const [count, setCount] = React.useState<number>(0);
  const [isRequestLogInUrl, setIsRequestLogInUrl] = React.useState<boolean>(
    false,
  );

  if (props.isClock24) {
    return (
      <Clock24
        message={props.message}
        date={props.date}
        onChangeUrl={props.onChangeUrl ?? (() => {})}
      />
    );
  }

  return (
    <div className={c(containerStyle)}>
      <div className={c(headerStyle)}>
        <div className={c(logoStyle)}>definy</div>
        <div className={c(spacer)}></div>
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
};
