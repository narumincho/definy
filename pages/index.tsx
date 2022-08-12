import * as React from "react";
import * as d from "../localData";
import Head from "next/head";
import { HomePage } from "../client/ui/HomePage";
import { WithHeader } from "../client/ui/WithHeader";
import { useDefinyApp } from "../client/hook/useDefinyApp";
import { useLanguage } from "../client/hook/useLanguage";

export const TopPage = (): React.ReactElement => {
  const useDefinyAppResult = useDefinyApp();
  const language = useLanguage();

  console.log("language", language);

  return (
    <>
      <Head>
        <title>
          definy 「手軽に堅牢なゲームとツールが作れて公開できる」
          が目標のWebアプリ
        </title>
      </Head>
      <WithHeader
        logInState={useDefinyAppResult.logInState}
        accountResource={useDefinyAppResult.accountResource}
        location={d.Location.About}
        language={language}
        logIn={useDefinyAppResult.logIn}
        titleItemList={[]}
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
      </WithHeader>
    </>
  );
};

export default TopPage;
