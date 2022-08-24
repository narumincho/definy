import * as React from "react";
import * as d from "../../localData";
import { LoadingBoxCenter } from "../../components/LoadingBox";
import { Text } from "../../components/Text";
import { WithHeader } from "../../components/WithHeader";
import { trpc } from "../../hooks/trpc";
import { useAccountToken } from "../../hooks/useAccountToken";
import { useQueryBasedState } from "../../hooks/useQueryBasedState";
import { useRouter } from "next/router";
import { zodTypeLocationAndLanguageToUrl } from "../../common/url";

type CodeAndState = {
  readonly code: string;
  readonly state: string;
};

const codeAndStateQueryToStructuredQuery = (
  query: ReadonlyMap<string, string>
): CodeAndState | undefined => {
  const code = query.get("code");
  const state = query.get("state");
  if (typeof code === "string" && typeof state === "string") {
    return { code, state };
  }
  return undefined;
};

const codeAndStateStructuredQueryToQuery = (): ReadonlyMap<string, string> =>
  new Map();

const codeAndStateIsEqual = (
  oldCodeAndState: CodeAndState | undefined,
  newCodeAndState: CodeAndState | undefined
): boolean => {
  if (oldCodeAndState === newCodeAndState) {
    return true;
  }
  return (
    oldCodeAndState?.code === newCodeAndState?.code &&
    oldCodeAndState?.state === newCodeAndState?.state
  );
};

export const LogInCallbackGoogle = (): React.ReactElement => {
  const logInByCodeAndState = trpc.useMutation("logInByCodeAndState");
  const router = useRouter();
  const { setAccountToken } = useAccountToken();

  React.useEffect(() => {
    if (logInByCodeAndState.isSuccess) {
      switch (logInByCodeAndState.data.type) {
        case "invalidCodeOrProviderResponseError":
          console.log("エラー 扱い");
          return;
        case "notGeneratedState":
          console.log("生成してないって");
          return;
        case "notExistsAccountInDefiny":
          // アカウント作成画面へ推移
          router.replace(
            {
              pathname: "/create-account",
              query: {
                name: logInByCodeAndState.data.nameInProvider,
                imageUrl: logInByCodeAndState.data.imageUrl,
                language: logInByCodeAndState.data.language,
                preAccountToken: logInByCodeAndState.data.preAccountToken,
              },
            },
            {
              pathname: "/create-account",
            }
          );
          return;
        case "logInOk": {
          setAccountToken(logInByCodeAndState.data.accountToken);
          router.replace(
            zodTypeLocationAndLanguageToUrl(
              logInByCodeAndState.data.location,
              logInByCodeAndState.data.language
            )
          );
        }
      }
    }
  }, [
    logInByCodeAndState.isSuccess,
    router,
    logInByCodeAndState.data,
    setAccountToken,
  ]);

  const onUpdate = React.useCallback(
    (newCodeAndState: CodeAndState | undefined) => {
      if (newCodeAndState !== undefined && logInByCodeAndState.isIdle) {
        const mutate = logInByCodeAndState.mutate;
        mutate({
          code: newCodeAndState.code,
          state: newCodeAndState.state,
        });
      }
    },
    [logInByCodeAndState.isIdle, logInByCodeAndState.mutate]
  );

  const queryBasedState = useQueryBasedState<CodeAndState | undefined>({
    queryToStructuredQuery: codeAndStateQueryToStructuredQuery,
    structuredQueryToQuery: codeAndStateStructuredQueryToQuery,
    onUpdate,
    isEqual: codeAndStateIsEqual,
  });
  return (
    <WithHeader
      logInState={d.LogInState.LoadingAccountData}
      location={undefined}
      language="english"
      titleItemList={[]}
      title={{
        japanese: "ログインコールバック",
        english: "log in callback",
        esperanto: "ensalutu revokon",
      }}
    >
      <div css={{ padding: 16, display: "grid", gap: 8, color: "white" }}>
        {queryBasedState.type === "loading" ? "reading query parameter" : <></>}
        {logInByCodeAndState.status === "loading" ? (
          <LoadingBoxCenter message="Checking if account exists..." />
        ) : (
          <></>
        )}
        {logInByCodeAndState.status === "success" &&
        logInByCodeAndState.data.type === "notGeneratedState" ? (
          "Is the login URL issued from other than define?"
        ) : (
          <></>
        )}
        {logInByCodeAndState.status === "success" &&
        logInByCodeAndState.data.type === "notExistsAccountInDefiny" ? (
          <Text
            language={logInByCodeAndState.data.language}
            japanese="definyのアカウント作成画面へ推移中..."
            english="Transitioning to the define account creation screen"
            esperanto="Transiro al la ekrano pri kreado de kontoj de definy"
          />
        ) : (
          <></>
        )}
        {logInByCodeAndState.status === "success" &&
        logInByCodeAndState.data.type ===
          "invalidCodeOrProviderResponseError" ? (
          "An error occurred on the server"
        ) : (
          <></>
        )}
        {logInByCodeAndState.status === "success" &&
        logInByCodeAndState.data.type === "logInOk" ? (
          "ログインに成功! この後の処理を作らなきゃ"
        ) : (
          <></>
        )}
      </div>
    </WithHeader>
  );
};

export default LogInCallbackGoogle;
