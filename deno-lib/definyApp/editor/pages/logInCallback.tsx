import React from "https://esm.sh/react@18.2.0?pin=v99";
import { c, toStyleAndHash } from "../../../cssInJs/mod.ts";
import {
  CodeAndState,
  logInByCodeAndState,
} from "../../apiClient/definyApi.ts";

const containerStyle = toStyleAndHash({
  backgroundColor: "black",
  color: "white",
  height: "100%",
  fontFamily: "Hack",
  display: "grid",
});

type RequestingState = {
  readonly type: "init";
} | {
  readonly type: "requesting";
} | {
  readonly type: "ok";
  readonly response: unknown;
};

export const LogInCallback = (
  props: { readonly parameter: CodeAndState },
): React.ReactElement => {
  const [requestingState, setRequestingState] = React.useState<RequestingState>(
    { type: "init" },
  );
  React.useEffect(() => {
    console.log("run in effect", props.parameter);
    if (requestingState.type !== "init") {
      return;
    }
    setRequestingState({ type: "requesting" });
    logInByCodeAndState({
      url: new URL(location.href).origin,
      input: props.parameter,
    }).then(
      (response) => {
        setRequestingState({ type: "ok", response });
      },
    );
  }, [requestingState]);
  return (
    <div className={c(containerStyle)}>
      ログインしているかの確認は....
      {JSON.stringify(requestingState)}
    </div>
  );
};