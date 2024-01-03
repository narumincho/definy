import dist from "../dist.json" with { type: "json" };
import { h } from "https://esm.sh/preact@10.19.3";
import { renderToString } from "https://esm.sh/preact-render-to-string@6.3.1";
import { App } from "../app/App.ts";

export const startDefinyServer = () => {
  Deno.serve((request) => {
    const url = new URL(request.url);
    switch (url.pathname) {
      case "/":
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
                src: "/" + dist.clientJsHash,
              }),
            ]),
            h("body", {}, [
              h("div", { id: "app" }, [h(App, {})]),
            ]),
          ])),
          {
            headers: {
              "Content-Type": "text/html",
            },
          },
        );
      case "/" + dist.clientJsHash:
        return new Response(dist.clientJsCode, {
          headers: {
            "Content-Type": "text/javascript",
          },
        });
      default:
        return new Response("Not Found", { status: 404 });
    }
  });
};
