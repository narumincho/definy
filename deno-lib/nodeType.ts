// いや... import map していできるのでは...?

// なぜか
// ```ts
// import type {
//   IncomingMessage,
//   ServerResponse,
// } from "https://deno.land/std@0.182.0/node/http.ts";
// ```
// と指定すると dnt のビルドが失敗してしまうので, 代わりの型の定義をここに書く

export type IncomingMessage = {
  method: string;
  headers: {
    [k: string]: string;
  };
  url: string;
};

export type ServerResponse = {
  statusCode?: number;
  statusMessage?: string;
  headersSent?: boolean;
  writeHead: (status: number, headers: Record<string, string>) => void;
  end: (chunk?: unknown) => void;
};

export type Server = {
  addListener: (
    name: "request",
    callBack: (
      incomingMessage: IncomingMessage,
      response: ServerResponse,
    ) => void,
  ) => void;
};
