import * as d from "../localData";
import * as React from "react";
import Head from "next/head";
import { Header } from "../client/ui/Header";
import { HomePage } from "../client/ui/HomePage";
import { LogInMessage } from "../components/LogInMessage";
import { css } from "@emotion/css";
import { useDefinyApp } from "../client/hook/useDefinyApp";
import { useLanguage } from "../client/hook/useLanguage";

export const TopPage = (): React.ReactElement => {
  const useDefinyAppResult = useDefinyApp();
  const language = useLanguage();

  return (
    <>
      <Head>
        <title>
          definy 「手軽に堅牢なゲームとツールが作れて公開できる」
          が目標のWebアプリ
        </title>
      </Head>
      <div
        className={css({
          width: "100%",
          height: "100%",
          display: "grid",
          overflow: "hidden",
          gridTemplateRows: "48px 1fr",
          backgroundColor: "#222",
        })}
      >
        <Header
          logInState={useDefinyAppResult.logInState}
          accountResource={useDefinyAppResult.accountResource}
          locationAndLanguage={{ location: d.Location.Home, language }}
          titleItemList={[]}
          onLogInButtonClick={useDefinyAppResult.logIn}
        />
        <LogInMessage
          logInState={useDefinyAppResult.logInState}
          language={language}
        />
        <div
          className={css({
            gridColumn: "1 / 2",
            gridRow: "2 / 3",
          })}
        >
          <HomePage
            topProjectsLoadingState={useDefinyAppResult.topProjectsLoadingState}
            accountResource={useDefinyAppResult.accountResource}
            language={language}
            logInState={useDefinyAppResult.logInState}
            projectResource={useDefinyAppResult.projectResource}
            requestTop50Project={useDefinyAppResult.requestTop50Project}
            typePartResource={useDefinyAppResult.typePartResource}
          />
        </div>
      </div>
    </>
  );
};

export default TopPage;
