import dist from "../dist.json" with { type: "json" };
import { h } from "https://esm.sh/preact@10.19.3";
import { renderToString } from "https://esm.sh/preact-render-to-string@6.3.1";
import { App } from "../app/App.ts";
import {
  locationFromPathAndQuery,
  locationToPathAndQuery,
  pathAndQueryFromUrl,
  pathAndQueryToPathAndQueryString,
} from "../app/location.ts";

const globalStyle = `
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #080808;
  color: #f0f0f0;
}

#app {
  width: 100%;
  height: 100%;
}
`;

const scriptUrl = pathAndQueryToPathAndQueryString(
  locationToPathAndQuery({
    type: "file",
    hash: dist.clientJsHash,
  }),
);

export const startDefinyServer = () => {
  Deno.serve((request) => {
    console.log(request.url);
    const url = new URL(request.url);
    const location = locationFromPathAndQuery(pathAndQueryFromUrl(url));
    if (location === undefined) {
      return new Response("Not Found", { status: 404 });
    }
    const normalizedPathAndQuery = pathAndQueryToPathAndQueryString(
      locationToPathAndQuery(location),
    );
    if (
      url.pathname + url.search !==
        normalizedPathAndQuery
    ) {
      return Response.redirect(new URL(normalizedPathAndQuery, request.url));
    }
    if (location.type === "file") {
      if (location.hash === dist.clientJsHash) {
        return new Response(dist.clientJsCode, {
          headers: {
            "Content-Type": "text/javascript",
          },
        });
      }
      return new Response("file Not Found", { status: 404 });
    }

    return new Response(
      "<!doctype html>" + renderToString(h("html", {}, [
        h("head", {}, [
          h("meta", { charset: "utf-8" }),
          h("meta", {
            name: "viewport",
            content: "width=device-width, initial-scale=1.0",
          }),
          h("title", {}, "definy"),
          h("script", {
            type: "module",
            src: scriptUrl,
          }),
          h("style", {}, globalStyle),
        ]),
        h("body", {}, [
          h("div", { id: "app" }, [h(App, { location })]),
        ]),
      ])),
      {
        headers: {
          "Content-Type": "text/html",
        },
      },
    );
  });
};
