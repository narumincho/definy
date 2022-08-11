import * as React from "react";
import { App } from "../client/ui/App";
import Head from "next/head";
import { useDefinyApp } from "../client/hook/useDefinyApp";

export const TopPage = (): React.ReactElement => {
  const useDefinyAppResult = useDefinyApp();

  return (
    <>
      <Head>
        <title>
          definy 「手軽に堅牢なゲームとツールが作れて公開できる」
          が目標のWebアプリ
        </title>
      </Head>
      <App useDefinyAppResult={useDefinyAppResult} />
    </>
  );
};

export default TopPage;
