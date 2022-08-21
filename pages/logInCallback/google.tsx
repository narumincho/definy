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

export const LogInCallbackGoogle = (): React.ReactElement => {
  const logInByCodeAndState = trpc.useMutation("logInByCodeAndState");
  const [isRequesting, setIsRequesting] = React.useState(false);
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
          router.push(
            zodTypeLocationAndLanguageToUrl(
              { type: "create-account" },
              "japanese"
            )
          );
          return;
        case "logInOk":
          console.log("ログイン成功扱い");
      }
    }
  }, [logInByCodeAndState.isSuccess, router, logInByCodeAndState.data]);

  const queryBasedState = useQueryBasedState<CodeAndState | undefined>({
    queryToStructuredQuery: (query) => {
      if (typeof query.code === "string" && typeof query.state === "string") {
        return {
          code: query.code,
          state: query.state,
        };
      }
      return undefined;
    },
    structuredQueryToQuery: () => {
      return {};
    },
    onUpdate: (newQuery: CodeAndState | undefined) => {
      if (
        newQuery !== undefined &&
        logInByCodeAndState.isIdle &&
        !isRequesting
      ) {
        console.log("API呼び出し...", newQuery);
        logInByCodeAndState.mutate({
          code: newQuery.code,
          state: newQuery.state,
        });
        setIsRequesting(true);
      }
    },
    isEqual: (oldCodeAndState, newCodeAndState) => {
      if (oldCodeAndState === newCodeAndState) {
        return true;
      }
      return (
        oldCodeAndState?.code === newCodeAndState?.code &&
        oldCodeAndState?.state === newCodeAndState?.state
      );
    },
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
        {logInByCodeAndState.status === "success" ? (
          "APIのリクエストが完了"
        ) : (
          <></>
        )}
      </div>
    </WithHeader>
  );
};

export default LogInCallbackGoogle;
