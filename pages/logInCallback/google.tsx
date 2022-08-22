import * as React from "react";
import * as d from "../../localData";
import { LoadingBoxCenter } from "../../components/LoadingBox";
import { WithHeader } from "../../components/WithHeader";
import { trpc } from "../../hooks/trpc";
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
              },
            },
            {
              pathname: "/create-account",
            }
          );
          return;
        case "logInOk":
          console.log("ログイン成功扱い");
      }
    }
  }, [logInByCodeAndState.isSuccess, router, logInByCodeAndState.data]);

  const onUpdate = React.useCallback(
    (newCodeAndState: CodeAndState | undefined) => {
      if (newCodeAndState !== undefined && logInByCodeAndState.isIdle) {
        console.log("API呼び出し...", newCodeAndState);
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
      location={{ type: "about" }}
      language={"english"}
      titleItemList={[]}
      title="ログインコールバック"
    >
      <div css={{ padding: 16, display: "grid", gap: 8, color: "white" }}>
        {queryBasedState.type === "loading" ? "パラメーター待ち" : <></>}
        {logInByCodeAndState.status === "loading" ? (
          <LoadingBoxCenter message="アカウントが存在するか確認中..." />
        ) : (
          <></>
        )}
        {logInByCodeAndState.status === "success" &&
        logInByCodeAndState.data.type === "notGeneratedState" ? (
          "definy 以外からログインURLを発行した?"
        ) : (
          <></>
        )}
        {logInByCodeAndState.status === "success" &&
        logInByCodeAndState.data.type === "notExistsAccountInDefiny" ? (
          "アカウント作成画面へ推移中..."
        ) : (
          <></>
        )}
        {logInByCodeAndState.status === "success" &&
        logInByCodeAndState.data.type ===
          "invalidCodeOrProviderResponseError" ? (
          "サーバーでエラーが発生しました"
        ) : (
          <></>
        )}
        {logInByCodeAndState.status === "success" &&
        logInByCodeAndState.data.type === "logInOk" ? (
          "ログインに成功!"
        ) : (
          <></>
        )}
      </div>
    </WithHeader>
  );
};

export default LogInCallbackGoogle;
