import "../styles.css";
import * as React from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import icon from "../static/icon.png";
import ogp from "../static/ogp.png";

const MyApp = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <Head>
        <link rel="icon" href={icon.src} />
        <link rel="apple-touch-icon" sizes="180x180" href={icon.src} />
        <meta
          name="description"
          content="ブラウザで動作する革新的なプログラミング言語!"
        />
        <meta name="twitter:card" content="summary" />
        <meta property="og:title" content="definy" />
        <meta property="og:site_name" content="definy" />
        <meta
          property="og:description"
          content="ブラウザで動作する革新的なプログラミング言語!"
        />
        <meta property="og:image" content={ogp.src} />
      </Head>
      <Component {...pageProps} />
    </>
  );
};

export default MyApp;
