import { serve } from "https://deno.land/std@0.154.0/http/server.ts";

const randomToken = [...crypto.getRandomValues(new Uint8Array(16))]
  .map((e) => e.toString(16).padStart(2, "0"))
  .join("");

serve(
  (request: Request) => {
    const url = new URL(request.url);
    console.log("request url", url);
    const token = url.searchParams.get("token");
    const isEqualToken = token === randomToken;

    const origin = request.headers.get("origin");

    if (url.pathname === "/") {
      const html = `<!doctype html>
      <html lang=\"ja\">
      
      <head>
        <meta charset=\"UTF-8\">
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
        <title>definy desktop</title>
        <style>
          body {
              background-color: black;
              color: white;
          }
      
          a {
              color: skyblue;
          }
        </style>
      </head>
      
      <body>
        definy desktop. <a href=\"https://definy.app\">definy.app</a> からリクエストを受けてブラウザからアクセスできないAPIを呼び出すためのもの. 
        <div>${
          isEqualToken ? "token が合っている!" : "token が合っていない..."
        }</div>
      </body>
      
      </html>`;
      return new Response(html, {
        headers: {
          "content-type": "text/html",
          "access-control-allow-origin":
            accessControlAllowOriginHeaderValue(origin),
        },
      });
    }
    if (url.pathname !== "/envs") {
      return new Response("not found...", { status: 404 });
    }
    if (!isEqualToken) {
      return new Response("invalid token", { status: 401 });
    }
    return new Response(JSON.stringify(Deno.env.toObject()), {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin":
          accessControlAllowOriginHeaderValue(origin),
      },
    });
  },
  {
    port: 2520,
    onListen: ({ port }) => {
      const url = new URL(`http://localhost:${port}`);
      url.searchParams.append("token", randomToken);
      console.log(
        `definy desktop start!\ncopy and pase url in https://definy.app !.\n下のURLをコピーしてhttps://definy.app で貼り付けて接続できる \n\n${url}`
      );
    },
  }
);

const accessControlAllowOriginHeaderValue = (origin: string | null): string => {
  if (origin === "http://localhost:3000") {
    return "http://localhost:3000";
  }
  if (typeof origin === "string" && origin.endsWith("-narumincho.vercel.app")) {
    return origin;
  }
  return "https://definy.app";
};
