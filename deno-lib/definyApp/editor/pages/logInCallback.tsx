import React from "https://esm.sh/react@18.2.0?pin=v117";
import { CodeAndState, logInByCodeAndState } from "../../apiClient/api/main.ts";
import { styled } from "../style.ts";
import { apiUrl } from "../url.ts";

const Container = styled("div", {
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
      url: apiUrl(),
      input: props.parameter,
    }).then(
      (response) => {
        setRequestingState({ type: "ok", response });
      },
    );
  }, [requestingState]);
  return (
    <Container>
      ログインしているかの確認は....
      {JSON.stringify(requestingState)}
    </Container>
  );
};
