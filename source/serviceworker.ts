import * as serviceWorkerPostData from "./serviceWorkerPostData";

((self: ServiceWorkerGlobalScope): void => {
  const codeFontKeyPath = "/codeFont";
  const iconKeyPath = "/icon";
  const htmlKeyPath = "/html";
  const programKeyPath = "/program";

  const saveToCache = (
    cache: Cache,
    url: string,
    keyPath: string,
    name: string
  ): Promise<void> =>
    fetch(url).then(
      response =>
        new Promise((resolve, reject) => {
          if (!response.ok) {
            reject(name + "が読み込めなかった");
          }
          cache.put(keyPath, response).then(
            () => {
              console.log(name + "をキャッシュに保存することに成功しました");
              resolve();
            },
            () => {
              console.error(name + "をキャッシュに保存できなかった");
              resolve();
            }
          );
        }),
      (): void => {
        console.error(
          name + "を保存するときにネットワークエラーが発生しました"
        );
      }
    );

  const sendMessageToClient = (
    message: serviceWorkerPostData.ServiceWorkerToClientMessage
  ): void => {
    self.clients
      .matchAll()
      .then(clients => clients.forEach(client => client.postMessage(message)));
  };

  self.addEventListener("install", e => {
    console.log("Service Worker: Installing");
    e.waitUntil(
      self.skipWaiting()
      // caches
      //   .open("v0")
      //   .then(cache =>
      //     Promise.all([
      //       saveToCache(
      //         cache,
      //         "/assets/hack-regular-subset.woff2",
      //         codeFontKeyPath,
      //         "コード用のフォント"
      //       ),
      //       saveToCache(cache, "/assets/icon.png", iconKeyPath, "アイコン"),
      //       saveToCache(cache, "/", htmlKeyPath, "HTML"),
      //       saveToCache(cache, "/main.js", programKeyPath, "プログラム")
      //     ])
      //   )
      //   // Service Workerの更新時に即座に制御を開始させる
      //   .then(self.skipWaiting)
    );
  });

  self.addEventListener("activate", e => {
    sendMessageToClient("startOfflineFileLoading");
    console.log("Service Worker: Activated");

    e.waitUntil(self.clients.claim());
  });

  self.addEventListener("fetch", e => {
    console.log(
      "Service Workerを通って " + e.request.url + " をリクエスしようとしている"
    );
    const accept = e.request.headers.get("accept");
    if (accept === null) {
      return;
    }
    if (accept.includes("text/html")) {
      caches
        .open("v0")
        .then(cache => cache.match(htmlKeyPath))
        .then(response => {
          if (response === undefined) {
            return;
          }
          e.respondWith(response);
        });
    }
    //       e.respondWith(
    //         new Response(
    //           `
    // <!doctype html>
    // <html>

    // <head>
    //     <meta charset="utf-8">
    //     <meta name="viewport" content="width=device-width,initial-scale=1">
    //     <title>Definy | オフライン</title>
    //     <link rel="icon" href="/assets/icon.png">
    //     <style>
    //         @font-face {
    //             font-family: "Roboto";
    //             font-style: normal;
    //             font-weight: 400;
    //             src: local("Roboto"), local("Roboto-Regular"),
    //                 url("https://fonts.gstatic.com/s/roboto/v19/KFOmCnqEu92Fr1Mu4mxK.woff2") format("woff2");
    //         }

    //         @font-face {
    //             font-family: "Open Sans";
    //             font-style: normal;
    //             font-weight: 300;
    //             font-display: swap;
    //             src: local("Open Sans Light"), local("OpenSans-Light"), url("https://fonts.gstatic.com/s/opensans/v17/mem5YaGs126MiZpBA-UN_r8OUuhp.woff2") format("woff2");
    //             unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    //         }

    //         /*
    //             Hack typeface https://github.com/source-foundry/Hack
    //             License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
    //         */

    //         @font-face {
    //             font-family: "Hack";
    //             font-weight: 400;
    //             font-style: normal;
    //             src: url("/assets/hack-regular-subset.woff2") format("woff2");
    //         }

    //         html {
    //             height: 100%;
    //         }

    //         body {
    //             height: 100%;
    //             margin: 0;
    //             background-color: black;
    //         }

    //         * {
    //             box-sizing: border-box;
    //         }
    //     </style>

    //     <script src="/main.js" defer></script>
    // </head>

    // <body>
    //     準備中……  (Definyはオフラインでも使えます!)
    // </body>

    // </html>`,
    //           { headers: { "content-type": "text/html" } }
    //         )
    //       );}

    e.waitUntil(async () => {
      const cache = await caches.open("v0");
      if (e.request.url === "https://definy-lang.web.app/main.js") {
        console.log("main.jsをオンライン時にリクエスト");
        e.respondWith((await cache.match(programKeyPath)) as Response);
      }
      return;
    });
  });
})((self as unknown) as ServiceWorkerGlobalScope);
