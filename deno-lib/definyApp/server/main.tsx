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
import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { Mode } from "./mode.ts";
import React from "https://esm.sh/react@18.2.0?pin=v106";
import { renderToString } from "https://esm.sh/react-dom@18.2.0/server?pin=v106";
import { App } from "../editor/app.tsx";
import dist from "./dist.json" assert { type: "json" };
import { clock24Title } from "../editor/pages/clock24.tsx";
import { createImageFromText } from "./ogpImage.tsx";
import { toBytes } from "https://deno.land/x/fast_base64@v0.1.7/mod.ts";
import { simpleUrlToUrlData, urlDataToSimpleUrl } from "./url.ts";
import {
  SimpleUrl,
  simpleUrlToUrlText,
} from "../../simpleRequestResponse/simpleUrl.ts";
import { getCssText } from "../editor/style.ts";

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
      ? `http://localhost:${parameter.mode.port}/api`
      // Deno Deploy で 現在の環境のオリジンを取得することができれば...
      // https://github.com/denoland/deploy_feedback/issues/245
      : "https://definy-api.deno.dev/api",
    codeGenOutputFolderPath: parameter.mode.type === "dev"
      ? new URL("../apiClient/", import.meta.url)
      : undefined,
    pathPrefix: ["api"],
  };
  serve(
    async (request) => {
      const simpleRequest = await requestObjectToSimpleRequest(request);
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
    return simpleResponseNotFoundHtml(createHtml({
      title: "not found",
      meta: undefined,
    }, <App language="english" location={undefined} />));
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
      return simpleResponseHtml(createHtml(
        {
          title: urlData.location.type === "clock24"
            ? clock24Title(urlData.location.parameter)
            : "definy editor",
          meta: urlData.location.type === "logInCallback" ? undefined : {
            description: "definy は 開発中です...",
            image: urlDataToSimpleUrl(
              simpleRequest.url.origin,
              urlData.location.type === "top" ? { type: "icon" } : {
                type: "clock24OgpImage",
                parameter: urlData.location.parameter,
              },
            ),
            normalizedUrl: urlDataToSimpleUrl(
              simpleRequest.url.origin,
              urlData,
            ),
          },
        },
        <App
          language="english"
          location={urlData.location}
        />,
      ));
    }
  }
};

const createHtml = (
  parameter: {
    readonly title: string;
    readonly meta: {
      readonly description: string;
      readonly normalizedUrl: SimpleUrl;
      readonly image: SimpleUrl;
    } | undefined;
  },
  body: React.ReactElement,
) => {
  const bodyAsHtml = renderToString(body);

  return "<!doctype html>" + renderToString(
    <html>
      <head>
        <title>{parameter.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href={dist.iconHash} />
        {parameter.meta === undefined ? <></> : (
          <>
            <meta name="description" content={parameter.meta.description} />
            <meta property="og:title" content={parameter.title} />
            <meta
              property="og:description"
              content={parameter.meta.description}
            />
            <meta
              property="og:url"
              content={simpleUrlToUrlText(parameter.meta.normalizedUrl)}
            />
            <meta property="og:site_name" content="definy" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta
              property="og:image"
              content={simpleUrlToUrlText(parameter.meta.image)}
            />
          </>
        )}
        <script type="module" src={dist.scriptHash} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
html, body, #root {
  height: 100%;
}

body {
  margin: 0;
}

:root {
  color-scheme: dark;
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
}`,
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: getCssText() }} />
      </head>
      <body>
        <div
          id="root"
          dangerouslySetInnerHTML={{
            __html: bodyAsHtml,
          }}
        >
        </div>
      </body>
    </html>,
  );
};
