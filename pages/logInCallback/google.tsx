import * as React from "react";
import * as d from "../../localData";
import { WithHeader } from "../../components/WithHeader";

export const LogInCallbackGoogle = (): React.ReactElement => {
  return (
    <WithHeader
      logInState={d.LogInState.LoadingAccountData}
      location={d.Location.About}
      language={d.Language.Japanese}
      titleItemList={[]}
      title="ログインコールバック"
    >
      <div css={{ padding: 16, display: "grid", gap: 8, color: "white" }}>
        Google でログインの後の処理をこれからする
      </div>
    </WithHeader>
  );
};

export default LogInCallbackGoogle;
