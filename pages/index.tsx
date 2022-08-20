import * as React from "react";
import Head from "next/head";
import { Header } from "../components/Header";
import iconPng from "../assets/icon.png";

const IndexPage = (): React.ReactElement => {
  return (
    <>
      <Head>
        <title>definy</title>
        <link rel="icon" type="image/png" href={iconPng.src} />
      </Head>
      <div
        css={{
          display: "grid",
          placeContent: "center",
          height: "100%",
          color: "white",
          backgroundColor: "black",
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
        definy 整備中...
      </div>
    </>
  );
};

export default IndexPage;
