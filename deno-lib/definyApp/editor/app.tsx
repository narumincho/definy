import React from "https://esm.sh/react@18.2.0";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";

const containerStyle = toStyleAndHash({
  backgroundColor: "black",
  color: "white",
  height: "100%",
});

export const App = (): React.ReactElement => {
  const [count, setCount] = React.useState<number>(0);
  return (
    <div className={c(containerStyle)}>
      レンダリングテスト
      <div>{count}</div>
      <button
        onClick={() => {
          setCount((prev) => prev + 1);
        }}
      >
        数値を1増やす
      </button>
    </div>
  );
};
