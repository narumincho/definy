import * as React from "react";
import * as d from "../../localData";
import { WithHeader } from "../../components/WithHeader";
import { useQueryBasedState } from "../../hooks/useQueryBasedState";

export const LogInCallbackGoogle = (): React.ReactElement => {
  const onQueryUpdate = React.useCallback(
    (
      newQuery:
        | {
            readonly code: string;
            readonly state: string;
          }
        | undefined
    ) => {
      console.log("リクエストする", newQuery);
    },
    []
  );

  const queryBasedState = useQueryBasedState<
    | {
        readonly code: string;
        readonly state: string;
      }
    | undefined
  >({
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
    onUpdate: onQueryUpdate,
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
      location={d.Location.About}
      language={d.Language.Japanese}
      titleItemList={[]}
      title="ログインコールバック"
    >
      <div css={{ padding: 16, display: "grid", gap: 8, color: "white" }}>
        {queryBasedState.type === "loading"
          ? "???"
          : "Google でログインの後の処理をこれからする"}
      </div>
    </WithHeader>
  );
};

export default LogInCallbackGoogle;
