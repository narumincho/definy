((self: ServiceWorkerGlobalScope): void => {
  self.addEventListener("install", e => {
    console.log("Service Worker: Installing");
  });

  self.addEventListener("activate", e => {
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
    if (!accept.includes("text/html")) {
      return;
    }
    e.respondWith(
      fetch(e.request.url, { redirect: "follow" }).then(response => {
        if (response.ok) {
          return response;
        }
        return new Response(
          `<!doctype html>
  <html>
  
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Definy | オフライン</title>
      <link rel="icon" href="icon">
      <style>
          /*
              Hack typeface https://github.com/source-foundry/Hack
              License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
          */
  
          @font-face {
              font-family: "Hack";
              font-weight: 400;
              font-style: normal;
              src: url("/hack-regular-subset.woff2") format("woff2");
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
  </head>
  
  <body>
      準備中……  (Definyはオフラインでも使えます!)
  </body>
  
  </html>`,
          { headers: { "content-type": "text/html" } }
        );
      })
    );
  });
})((self as unknown) as ServiceWorkerGlobalScope);
