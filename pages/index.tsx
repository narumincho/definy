import * as React from "react";
import Head from "next/head";
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
        よさげ
      </div>
    </>
  );
};

export default IndexPage;
