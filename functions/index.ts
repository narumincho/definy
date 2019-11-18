import * as functions from "firebase-functions";
import * as graphqlExpress from "express-graphql";
import * as schema from "./lib/schema";
import * as libLogInCallback from "./lib/logInCallback";
import * as express from "express";
import * as databaseLow from "./lib/databaseLow";
import * as type from "./lib/type";
import * as firestoreType from "../firestoreType";

const f: firestoreType.SampleType = {
    value: 10
};

console.log("サーバーのプログラムが読み込まれた");
/* =====================================================================
 *               Index Html ブラウザが最初にリクエストするところ
 *
 *          https://definy-lang.web.app/ など
 *              ↓ firebase.json rewrite
 *          Cloud Functions for Firebase / indexHtml
 * =====================================================================
 */
export const indexHtml = functions.https.onRequest((request, response) => {
    if (request.hostname !== "definy-lang.web.app") {
        response.redirect("https://definy-lang.web.app");
        return;
    }
    response.status(200);
    response.setHeader("content-type", "text/html");
    response.send(`<!doctype html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Definy</title>
    <link rel="icon" href="/assets/icon.png">
    <meta name="description" content="ブラウザで動作する革新的なプログラミング言語">
    <meta name="twitter:card" content="summary_large_image">
    <meta property="og:url" content="https://definy-lang.web.app${request.url}">
    <meta property="og:title" content="${escapeHtml(
        "タイトル" + Math.random()
    )}">
    <meta property="og:site_name" content="Definy">
    <meta property="og:description" content="${escapeHtml("説明文!")}">
    <meta property="og:image" content="${escapeHtml(
        "https://definy-lang.web.app/assets/icon.png"
    )}">
    <style>
        @font-face {
            font-family: "Roboto";
            font-style: normal;
            font-weight: 400;
            src: local("Roboto"), local("Roboto-Regular"),
                url("https://fonts.gstatic.com/s/roboto/v19/KFOmCnqEu92Fr1Mu4mxK.woff2") format("woff2");
        }

        @font-face {
            font-family: "Open Sans";
            font-style: normal;
            font-weight: 300;
            font-display: swap;
            src: local("Open Sans Light"), local("OpenSans-Light"), url("https://fonts.gstatic.com/s/opensans/v17/mem5YaGs126MiZpBA-UN_r8OUuhp.woff2") format("woff2");
            unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }

        /*
            Hack typeface https://github.com/source-foundry/Hack
            License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
        */

        @font-face {
            font-family: "Hack";
            font-weight: 400;
            font-style: normal;
            src: url("/assets/hack-regular-subset.woff2") format("woff2");
        }

        html {
            height: 100%;
        }

        body {
            height: 100%;
            margin: 0;
            background-color: black;
        }

        * {
            box-sizing: border-box;
        }
    </style>

    <script src="/main.js" defer></script>
    <script src="/__/firebase/7.3.0/firebase-app.js" defer></script>
    <script src="/__/firebase/7.3.0/firebase-firestore.js" defer></script>
    <script src="/__/firebase/init.js" defer></script>
    <script src="/call.js" type="module"></script>
</head>

<body>
    読み込み中……
</body>

</html>`);
});

const escapeHtml = (text: string): string =>
    text.replace(/[&'`"<>]/g, (s: string): string =>
        s === "&"
            ? "&amp;"
            : s === "'"
            ? "&#x27;"
            : s === "`"
            ? "&#x60;"
            : s === '"'
            ? "&quot;"
            : s === "<"
            ? "&lt;"
            : s === ">"
            ? "&gt;"
            : ""
    );

/* =====================================================================
 *                          API (GraphQL)
 *        https://us-central1-definy-lang.cloudfunctions.net/api
 * =====================================================================
 */
export const api = functions
    .runWith({ memory: "2GB" })
    .https.onRequest((request, response) => {
        console.log("API called");
        response.setHeader(
            "access-control-allow-origin",
            "https://definy-lang.web.app"
        );
        response.setHeader("vary", "Origin");
        if (request.method === "OPTIONS") {
            response.setHeader(
                "access-control-allow-methods",
                "POST, GET, OPTIONS"
            );
            response.setHeader("access-control-allow-headers", "content-type");
            response.status(200).send("");
            return;
        }
        graphqlExpress({ schema: schema.schema, graphiql: true })(
            request,
            response
        );
    });

/* =====================================================================
 *              ソーシャルログインをしたあとのリダイレクト先
 *   https://us-central1-definy-lang.cloudfunctions.net/logInCallback
 * =====================================================================
 */
export const logInCallback = functions.https.onRequest(
    async (request, response) => {
        switch (request.path) {
            case "/google":
                sendResponseFromLogInCallbackResult(
                    await libLogInCallback.googleLogInReceiver(request.query),
                    response
                );
                return;
            case "/gitHub":
                sendResponseFromLogInCallbackResult(
                    await libLogInCallback.gitHubLogInReceiver(request.query),
                    response
                );
                return;
            case "/line":
                sendResponseFromLogInCallbackResult(
                    await libLogInCallback.lineLogInReceiver(request.query),
                    response
                );
                return;
            default:
                response
                    .status(400)
                    .send(
                        "Definy social login callback doesn't support anything other than Google, GitHub and LINE"
                    );
                return;
        }
    }
);

const sendResponseFromLogInCallbackResult = (
    result: libLogInCallback.Result,
    response: express.Response
): void => {
    switch (result.type) {
        case "error":
            response.status(400).send(result.message);
            return;
        case "redirect":
            response.redirect(result.url.toString());
    }
};

/* =====================================================================
 *                 File バイナリファイルを欲しいときに利用する
 *      https://us-central1-definy-lang.cloudfunctions.net/file
 * =====================================================================
 */
export const file = functions.https.onRequest(async (request, response) => {
    response.setHeader(
        "access-control-allow-origin",
        "https://definy-lang.web.app/"
    );
    response.setHeader("vary", "Origin");
    if (request.method === "OPTIONS") {
        response.setHeader(
            "access-control-allow-methods",
            "POST, GET, OPTIONS"
        );
        response.setHeader("access-control-allow-headers", "content-type");
        response.status(200).send("");
        return;
    }
    if (request.method === "GET") {
        response.setHeader("cache-control", "public, max-age=31536000");
        databaseLow
            .getReadableStream(type.parseFileHash(request.path.slice(1)))
            .pipe(response);
        return;
    }
    response.status(400).send("invalid file parameter");
});

/* =====================================================================
 *                  Sitemap クローラーに対するサイトマップ
 *    https://us-central1-definy-lang.cloudfunctions.net/sitemap
 * =====================================================================
 */
export const sitemap = functions
    .region("us-central1")
    .https.onRequest(async (request, response) => {
        response.setHeader("content-type", "application/xml");
        response.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pathToXml("")}
</urlset>`);
    });

const pathToXml = (path: string): string => `
    <url>
        <loc>https://definy-lang.web.app/${path}</loc>
        <lastmod>2019-09-17</lastmod>
    </url>
`;
