"use strict";
((self) => {
    self.addEventListener("install", e => {
        console.log("Service Worker内でServiceWorkerがブラウザにインストールされたことを検知した!");
        e.waitUntil(self.skipWaiting());
    });
    self.addEventListener("activate", e => {
        console.log("Service Workerがアクティブな状態になった");
        e.waitUntil(self.clients.claim());
    });
    self.addEventListener("fetch", e => {
        if (navigator.onLine) {
            if (e.request.url === "https://definy-lang.web.app/main.js") {
                console.log("main.jsをオンライン時にリクエスト");
                e.respondWith(fetch("/main.js", { cache: "no-cache" }));
            }
            return;
        }
        const accept = e.request.headers.get("accept");
        if (accept === null) {
            return;
        }
        if (accept.includes("text/html")) {
            e.respondWith(new Response(`
<!doctype html>
<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Definy | オフライン</title>
    <link rel="icon" href="/assets/icon.png">
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
    <script src="/call.js" type="module"></script>
</head>

<body>
    オフライン。キャッシュからプログラミングを読み込めるか試行錯誤中
</body>

</html>`, { headers: { "content-type": "text/html" } }));
        }
    });
})(self);
