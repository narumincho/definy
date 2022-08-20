import * as React from "react";
import * as d from "../localData";
import Head from "next/head";
import { Link } from "../components/Link";
import { WithHeader } from "../components/WithHeader";
import iconPng from "../assets/icon.png";
import { useLanguage } from "../hooks/useLanguage";

export const ToolListPage = (): React.ReactElement => {
  const language = useLanguage();
  console.log("language in tool", language);

  return (
    <>
      <Head>
        <title>definyとは直接関係ないツール</title>
        <link rel="icon" type="image/png" href={iconPng.src} />
      </Head>
      <WithHeader
        location={d.Location.ToolList}
        language={language}
        accountResource={{
          getFromMemoryCache: () => undefined,
          requestToServerIfEmpty: () => {},
          forciblyRequestToServer: () => {},
        }}
        logInState={{
          _: "LoadingAccountTokenFromIndexedDB",
        }}
        titleItemList={[]}
        logIn={() => {
          console.log("ログインしたようです");
        }}
      >
        <h2 css={{ color: "white" }}>definyとは直接関係ないツール</h2>
        <div css={{ display: "grid", gap: 8, padding: 8 }}>
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
