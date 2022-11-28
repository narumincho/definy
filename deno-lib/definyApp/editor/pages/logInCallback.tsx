import React from "https://esm.sh/react@18.2.0?pin=v99";
import { c, toStyleAndHash } from "../../../cssInJs/mod.ts";
import { CodeAndState } from "../url.ts";

const containerStyle = toStyleAndHash({
  backgroundColor: "black",
  color: "white",
  height: "100%",
  fontFamily: "Hack",
  display: "grid",
});

export const LogInCallback = (
  props: { readonly parameter: CodeAndState },
): React.ReactElement => {
  return (
    <div className={c(containerStyle)}>
      ログインしているかの確認は....
    </div>
  );
};
