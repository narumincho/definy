export {};

const main = (args: ReadonlyArray<string>): void => {
  if (args.length !== 3) {
    console.log(`usage: ${args[1]} [--language-server|FILE]`);
    return;
  }
  if (args[2] === "--language-server") {
    runLanguageServer();
    return;
  }
  console.log("考慮していないパラメータを受け取った.", args);
};

const runLanguageServer = (): void => {
  receiveJsonRpcMessage((request) => {
    if (request.type === "error") {
      sendJsonRpcMessage({
        method: "window/logMessage",
        params: {
          type: 3,
          message: `理解できないメッセージが来ました message:${
            request.message
          }, rawObject:${JSON.stringify(request.rawObject)}
          `,
        },
      });
      return;
    }
    switch (request.method) {
      case "initialize": {
        sendJsonRpcMessage({
          method: "window/logMessage",
          params: {
            type: 3,
            message: "initialize 来たぜ",
          },
        });
        sendJsonRpcMessage({
          id: request.id,
          result: {
            capabilities: {
              textDocumentSync: 1,
            },
          },
        });
        return;
      }
      case "initialized": {
        sendJsonRpcMessage({
          method: "window/logMessage",
          params: {
            type: 3,
            message: "initialized 来たぜ",
          },
        });
      }
    }
  });
};

type JsonRpcRequestOrParseError =
  | {
      readonly type: "error";
      readonly message: string;
      readonly rawObject: unknown;
    }
  | {
      readonly type: "ok";
      readonly id: number;
      readonly method: "initialize" | "initialized";
    };

/**
 * JSON-RPC 2.0 のメッセージを標準入力(`stdin`)から受け取る.
 * @param callback
 */
const receiveJsonRpcMessage = (
  callback: (data: JsonRpcRequestOrParseError) => void
): void => {
  let buffer = new Uint8Array();
  process.stdin.on("data", (data) => {
    const result = binaryToJsonRpcMessage(data);
    if (result === "need more") {
      buffer = new Uint8Array([...buffer, ...data]);
    } else {
      callback(result);
      buffer = new Uint8Array();
    }
  });
};

const binaryToJsonRpcMessage = (
  binary: Uint8Array
): JsonRpcRequestOrParseError | "need more" => {
  try {
    return stringToJsonRpcMessage(new TextDecoder().decode(binary));
  } catch (error) {
    return "need more";
  }
};

const stringToJsonRpcMessage = (
  message: string
): JsonRpcRequestOrParseError | "need more" => {
  const headerAndBody = message.split("\r\n\r\n");
  const body = headerAndBody[1];
  if (body === undefined) {
    return "need more";
  }
  try {
    const jsonValue: unknown = JSON.parse(body);
    if (typeof jsonValue !== "object") {
      return {
        type: "error",
        message: "error. body is not json object",
        rawObject: jsonValue,
      };
    }
    return objectToJsonRpcMessage(jsonValue as JsonRpcRequestLooseObject);
  } catch (error: unknown) {
    return "need more";
  }
};

type JsonRpcRequestLooseObject = {
  readonly id: unknown;
  readonly method: unknown;
};

const objectToJsonRpcMessage = (
  message: JsonRpcRequestLooseObject
): JsonRpcRequestOrParseError | "need more" => {
  if (typeof message.id !== "number") {
    return { type: "error", message: "unknown id type", rawObject: message };
  }
  if (message.method === "initialize" || message.method === "initialized") {
    return {
      type: "ok",
      id: message.id,
      method: message.method,
    };
  }
  return { type: "error", message: "unknown method...", rawObject: message };
};

type JsonRpcResponse =
  | {
      readonly method: "window/logMessage";
      readonly params: {
        readonly type: 3;
        readonly message: string;
      };
    }
  | {
      readonly id: number;
      readonly result: {
        readonly capabilities: { readonly textDocumentSync: 1 };
      };
    };

/**
 * JSON-RPC 2.0 でメッセージを標準出力(`stdout`) に送る
 */
const sendJsonRpcMessage = (message: JsonRpcResponse): void => {
  const jsonValue = JSON.stringify({
    jsonrpc: "2.0",
    ...message,
  });
  process.stdout.write(
    `Content-Length: ${
      new TextEncoder().encode(jsonValue).length
    }\r\nContent-Type: application/vscode-jsonrpc; charset=utf-8\r\n\r\n${jsonValue}`
  );
};

main(process.argv);
