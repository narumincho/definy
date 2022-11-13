import React from "https://esm.sh/react@18.2.0";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";

const containerStyle = toStyleAndHash({
  backgroundColor: "black",
  color: "white",
  height: "100%",
  fontFamily: "Hack",
  display: "grid",
  gridTemplateRows: "48px 1fr",
});

const logoStyle = toStyleAndHash({
  color: "#b9d09b",
  fontSize: 32,
  padding: 8,
  backgroundColor: "#333",
  lingHeight: "1",
});

type Props = {
  readonly locationAndLanguage: LocationAndLanguage;
};

type LocationAndLanguage = {
  readonly language: "en" | "ja" | "eo";
  readonly location: "top" | "toolsClock" | "tool";
};

export const App = (): React.ReactElement => {
  const [count, setCount] = React.useState<number>(0);
  return (
    <div className={c(containerStyle)}>
      <div className={c(logoStyle)}>definy</div>
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
