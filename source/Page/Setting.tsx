import * as React from "react";
import * as ui from "../ui";
import { Model } from "../model";

export const Setting: React.FC<{ model: Model }> = (prop) => {
  if (prop.model.logInState._ !== "LoggedIn") {
    return <div>ログインしていません</div>;
  }
  const loggedUserId = prop.model.logInState.AccountTokenAndUserId.userId;
  return (
    <div>
      <div>設定画面</div>
      <ui.User model={prop.model} userId={loggedUserId} />
      <ui.Button
        onClick={() => {
          prop.model.requestLogOut();
        }}
      >
        ログアウトする
      </ui.Button>
    </div>
  );
};
