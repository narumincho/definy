import * as React from "react";
import * as d from "../../data";
import { Button } from "./Button";
import { Header } from "./Header";
import { css } from "@emotion/css";

export type Props = {
  onJump: (urlData: d.UrlData) => void;
  language: d.Language;
  logInState: d.LogInState;
  accountDict: ReadonlyMap<d.AccountId, d.Account>;
  onClickLogoutButton: () => void;
};

export const SettingPage: React.VFC<Props> = (props) => {
  return (
    <div
      className={css({
        height: "100%",
        display: "grid",
        overflow: "hidden",
        gridTemplateRows: "48px 1fr",
        backgroundColor: "#222",
      })}
    >
      <Header
        logInState={props.logInState}
        accountDict={props.accountDict}
        language={props.language}
        titleItemList={[]}
        onJump={props.onJump}
        onLogInButtonClick={() => {}}
      />
      <div
        className={css({
          display: "grid",
          overflowY: "scroll",
          alignContent: "start",
          gap: 8,
          padding: 16,
        })}
      >
        <div
          className={css({
            fontSize: 32,
          })}
        >
          設定
        </div>
        <Button onClick={props.onClickLogoutButton}>ログアウトする</Button>
        <div>アカウントの情報</div>
      </div>
    </div>
  );
};
