import * as React from "react";
import * as d from "../localData";
import Head from "next/head";
import { Link } from "../client/ui/Link";
import { WithHeader } from "../client/ui/WithHeader";
import { css } from "@emotion/css";
import { useDefinyApp } from "../client/hook/useDefinyApp";
import { useLanguage } from "../client/hook/useLanguage";

export const ToolListPage = (): React.ReactElement => {
  const useDefinyAppResult = useDefinyApp();
  const language = useLanguage();
  console.log("language in tool", language);

  return (
    <>
      <Head>
        <title>definyとは直接関係ないツール</title>
      </Head>
      <WithHeader
        location={d.Location.ToolList}
        language={language}
        accountResource={useDefinyAppResult.accountResource}
        logInState={useDefinyAppResult.logInState}
        logIn={useDefinyAppResult.logIn}
        titleItemList={[]}
      >
        <h2>definyとは直接関係ないツール</h2>
        <div className={css({ display: "grid", gap: 8, padding: 8 })}>
          <Link
            locationAndLanguage={{
              location: d.Location.Tool(d.ToolName.ThemeColorRainbow),
              language,
            }}
            style={{ padding: 8 }}
          >
            テーマカラーレインボー
          </Link>
          <Link
            locationAndLanguage={{
              location: d.Location.Tool(d.ToolName.SoundQuiz),
              language,
            }}
            style={{ padding: 8 }}
          >
            音の周波数クイズ
          </Link>
        </div>
      </WithHeader>
    </>
  );
};

export default ToolListPage;
