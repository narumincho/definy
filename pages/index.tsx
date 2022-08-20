import * as React from "react";
import * as d from "../localData";
import Head from "next/head";
import { Header } from "../components/Header";
import { Link } from "../components/Link";
import iconPng from "../assets/icon.png";
import { useLanguage } from "../hooks/useLanguage";

const IndexPage = (): React.ReactElement => {
  const language = useLanguage();

  return (
    <>
      <Head>
        <title>definy</title>
        <link rel="icon" type="image/png" href={iconPng.src} />
      </Head>
      <div
        css={{
          display: "grid",
          height: "100%",
          color: "white",
          backgroundColor: "black",
          gridTemplateRows: "auto 1fr",
        }}
        lang="ja"
      >
        <Header
          accountResource={{
            getFromMemoryCache: () => undefined,
            requestToServerIfEmpty: () => {},
            forciblyRequestToServer: () => {},
          }}
          logInState={{
            _: "LoadingAccountTokenFromIndexedDB",
          }}
          onLogInButtonClick={() => {
            console.log("ログインボタンをクリックしたようだ");
          }}
          titleItemList={[]}
          locationAndLanguage={{
            location: {
              _: "Home",
            },
            language: "Japanese",
          }}
        />
        <div>
          <div css={{ padding: 16 }}>
            <HomeLinkList language={language} />
          </div>
          definy 整備中...
        </div>
      </div>
    </>
  );
};

export default IndexPage;

const HomeLinkList = (props: {
  readonly language: d.Language;
}): React.ReactElement => {
  return (
    <div
      css={{
        display: "grid",
        gridAutoFlow: "column",
        justifyContent: "end",
        alignItems: "center",
        height: 32,
        gap: 8,
      }}
    >
      <Link
        locationAndLanguage={{
          location: d.Location.About,
          language: props.language,
        }}
        style={{ padding: 4 }}
      >
        definyについて
      </Link>
      <Link
        locationAndLanguage={{
          location: d.Location.LocalProject,
          language: props.language,
        }}
        style={{ padding: 4 }}
      >
        ファイルから開く
      </Link>
      <Link
        locationAndLanguage={{
          location: d.Location.ToolList,
          language: props.language,
        }}
        style={{ padding: 4 }}
      >
        ツール
      </Link>
    </div>
  );
};
