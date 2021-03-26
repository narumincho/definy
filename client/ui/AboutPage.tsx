import * as React from "react";
import * as d from "../../data";
import { Header } from "./Header";
import { css } from "@emotion/css";

export type Props = {
  onJump: (urlData: d.UrlData) => void;
  language: d.Language;
  logInState: d.LogInState;
  accountDict: ReadonlyMap<d.AccountId, d.Account>;
  onLogInButtonClick: () => void;
};

export const AboutPage: React.VFC<Props> = (props) => {
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
        onLogInButtonClick={props.onLogInButtonClick}
      />
      <div
        className={css({
          display: "grid",
          overflowY: "scroll",
          gap: 8,
          padding: 16,
        })}
      >
        <div>Definyについて</div>
      </div>
    </div>
  );
};
