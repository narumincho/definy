import * as React from "react";
import { Button } from "./Button";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";

export type Props = Pick<
  UseDefinyAppResult,
  "accountResource" | "language" | "logInState"
> & {
  onJump: UseDefinyAppResult["jump"];
  onLogOut: UseDefinyAppResult["logOut"];
};

export const SettingPage: React.VFC<Props> = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        overflowY: "scroll",
        alignContent: "start",
        gap: 8,
        padding: 16,
        height: "100%",
      })}
    >
      <div
        className={css({
          fontSize: 32,
        })}
      >
        設定
      </div>
      <Button onClick={props.onLogOut}>ログアウトする</Button>
      <div>アカウントの情報</div>
    </div>
  );
};
