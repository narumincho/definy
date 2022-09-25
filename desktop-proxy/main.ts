import { serve } from "https://deno.land/std@0.157.0/http/server.ts";
import { definyRpc } from "../definy-rpc/server/mod.ts";

const randomToken = [...crypto.getRandomValues(new Uint8Array(16))]
  .map((e) => e.toString(16).padStart(2, "0"))
  .join("");

const portNumber = 2520;

const desktopProxyServer = definyRpc.createHttpServer({
  name: "definy-desktop-proxy",
  all: () => [
    definyRpc.createApiFunction({
      fullName: ["envs"],
      description: "環境変数を取得する",
      needAuthentication: true,
      isMutation: false,
      input: definyRpc.unit,
      output: definyRpc.set(definyRpc.string),
      resolve: (_, accountToken) => {
        if (accountToken === randomToken) {
          return new Set(Object.keys(Deno.env.toObject()));
        }
        return new Set();
      },
    }),
  ],
  originHint: `http://localhost:${portNumber}`,
  codeGenOutputFolderPath: "./client/generated",
});

serve(
  async (request) => {
    const response = await desktopProxyServer(request);

    response.headers.append(
      "access-control-allow-origin",
      accessControlAllowOriginHeaderValue(request.headers.get("origin"))
    );
    response.headers.append("access-control-request-method", "GET");
    response.headers.append("access-control-allow-headers", "authorization");

    return response;
  },
  {
    port: portNumber,
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
  if (origin === "http://localhost:2520") {
    return "http://localhost:2520";
  }
  if (
    typeof origin === "string" &&
    (origin.endsWith("-narumincho.vercel.app") ||
      origin === "https://definy.vercel.app")
  ) {
    return origin;
  }
  return "https://definy.app";
};
