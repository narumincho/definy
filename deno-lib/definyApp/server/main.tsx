import * as definyRpc from "../../definyRpc/server/definyRpc.ts";
import { funcList } from "./funcList.ts";
import * as f from "../../typedFauna.ts";
import {
  requestObjectToSimpleRequest,
  SimpleRequest,
} from "../../simpleRequestResponse/simpleRequest.ts";
import {
  SimpleResponse,
  simpleResponseHtml,
  simpleResponseImmutableJavaScript,
  simpleResponseImmutablePng,
  simpleResponseImmutableWoff2Font,
  simpleResponseNotFoundHtml,
  simpleResponseToResponse,
} from "../../simpleRequestResponse/simpleResponse.ts";
import { serve } from "https://deno.land/std@0.166.0/http/server.ts";
import { fromFileUrl } from "https://deno.land/std@0.156.0/path/mod.ts";
import { Mode } from "./mode.ts";
import React from "https://esm.sh/react@18.2.0?pin=v99";
import { renderToString } from "https://esm.sh/react-dom@18.2.0/server?pin=v99";
import { App } from "../editor/app.tsx";
import dist from "./dist.json" assert { type: "json" };
import { getRenderedCss, resetInsertedStyle } from "../../cssInJs/mod.ts";
import { clock24Title } from "../editor/pages/clock24.tsx";
import { createImageFromText } from "./ogpImage.tsx";
import { toBytes } from "https://deno.land/x/fast_base64@v0.1.7/mod.ts";
import { simpleUrlToUrlData, urlDataToSimpleUrl } from "./url.ts";
import { simpleUrlToUrlText } from "../../simpleRequestResponse/simpleUrl.ts";

export const startDefinyServer = (
  parameter: {
    /** 開発モードかどうか */
    readonly mode: Mode;
    /** データベースのfaunaのシークレットキー */
    readonly faunaSecret: string;
    /**
     * Google でログイン のクライアントシークレット
     * Google Cloud Console の設定画面で 起動するオリジン+ /definyApi/logInCallback
     * のコールバックURLを許可する必要あり
     */
    readonly googleLogInClientSecret: string;
  },
): void => {
  const sampleDefinyRpcServerParameter: definyRpc.DefinyRpcParameter = {
    name: "definyApi",
    all: () =>
      funcList(
        f.crateFaunaClient({
          domain: "db.us.fauna.com",
          secret: parameter.faunaSecret,
        }),
        parameter.mode,
      ),
    originHint: parameter.mode.type === "dev"
      ? `http://localhost:${parameter.mode.port}`
      // Deno Deploy で 現在の環境のオリジンを取得することができれば...
      // https://github.com/denoland/deploy_feedback/issues/245
      : "https://definy-api.deno.dev",
    codeGenOutputFolderPath: parameter.mode.type === "dev"
      ? fromFileUrl(import.meta.resolve("../apiClient"))
      : undefined,
    pathPrefix: ["api"],
  };
  serve(
    async (request) => {
      const simpleRequest = requestObjectToSimpleRequest(request);
      if (simpleRequest === undefined) {
        return new Response("simpleRequestに変換できなかった", { status: 400 });
      }
      const simpleResponse = await handleSimpleRequest(
        sampleDefinyRpcServerParameter,
        simpleRequest,
      );
      return simpleResponseToResponse(simpleResponse);
    },
    parameter.mode.type === "dev" ? { port: parameter.mode.port } : {},
  );
};

const handleSimpleRequest = async (
  definyRpcParameter: definyRpc.DefinyRpcParameter,
  simpleRequest: SimpleRequest,
): Promise<SimpleResponse> => {
  const simpleResponse = await definyRpc.handleRequest(
    definyRpcParameter,
    simpleRequest,
  );
  if (simpleResponse !== undefined) {
    return simpleResponse;
  }
  const urlData = simpleUrlToUrlData(simpleRequest.url);
  if (urlData === undefined) {
    // not found の html
    return simpleResponseNotFoundHtml(`<!doctype html>
    <html>
      <head>
        <title>not found | definy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" type="image/png" href="/${dist.iconHash}">
        
        <script type="module" src="/${dist.scriptHash}"></script>
        <style>
    html, body, #root {
      height: 100%;
    }
    
    body {
      margin: 0;
    }
    
    /*
      Hack typeface https://github.com/source-foundry/Hack
      License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
    */
    @font-face {
      font-family: "Hack";
      font-weight: 400;
      font-style: normal;
      src: url("/${dist.fontHash}") format("woff2");
    }
        </style>
      </head>
      <body>
         not found... ページが見つかりませんでした....
      </body>
    </html>`);
  }
  switch (urlData.type) {
    case "script":
      return simpleResponseImmutableJavaScript(dist.scriptContent);
    case "icon":
      return simpleResponseImmutablePng(await toBytes(dist.iconContent));
    case "font":
      return simpleResponseImmutableWoff2Font(await toBytes(dist.fontContent));
    case "clock24OgpImage": {
      const image = await createImageFromText(urlData.parameter);
      return simpleResponseImmutablePng(image);
    }
    case "html": {
      resetInsertedStyle();

      const body = renderToString(
        <App
          language="english"
          location={urlData.location}
        />,
      );
      const title = urlData.location.type === "clock24"
        ? clock24Title(urlData.location.parameter)
        : "definy editor";

      return simpleResponseHtml(
        `<!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" type="image/png" href="/${dist.iconHash}">
        <meta name="description" content="${new Date().toISOString()}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${new Date().toISOString()}">
        <meta property="og:url" content="${
          simpleUrlToUrlText(
            urlDataToSimpleUrl(simpleRequest.url.origin, urlData),
          )
        }">
        <meta property="og:site_name" content="definy">
        <meta name="twitter:card" content="summary_large_image">
        <meta property="og:image" content="${
          simpleUrlToUrlText(
            urlDataToSimpleUrl(
              simpleRequest.url.origin,
              urlData.location.type === "top" ? { type: "icon" } : {
                type: "clock24OgpImage",
                parameter: urlData.location.parameter,
              },
            ),
          )
        }">
        <meta name="twitter:creator" content="@naru_mincho">
        <script type="module" src="/${dist.scriptHash}"></script>
        <style>${getRenderedCss()}</style>
        <style>
    html, body, #root {
      height: 100%;
    }
    
    body {
      margin: 0;
    }
    
    /*
      Hack typeface https://github.com/source-foundry/Hack
      License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
    */
    @font-face {
      font-family: "Hack";
      font-weight: 400;
      font-style: normal;
      src: url("/${dist.fontHash}") format("woff2");
    }
        </style>
      </head>
      <body>
        <div id="root">${body}</div>
      </body>
    </html>
    `,
      );
    }
  }
};
