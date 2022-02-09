export {};

const main = (args: ReadonlyArray<string>): void => {
  if (args.length !== 3) {
    console.log(`usage: ${args[1]} [--language-server|FILE]`);
    return;
  }
  if (args[2] === "--language-server") {
    receiveJsonRpcMessage((data) => {
      if (data.type === "error") {
        sendJsonRpcMessage({
          method: "window/logMessage",
          params: {
            type: 3,
            message: `理解できないメッセージが来ました message:${
              data.message
            }, rawObject:${JSON.stringify(data.rawObject)}
        `,
          },
        });
      } else {
        sendJsonRpcMessage({
          id: data.id,
          result: {
            capabilities: {},
          },
        });
      }
    });
    return;
  }
  console.log("考慮していないパラメータを受け取った.", args);
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
      readonly method: "initialize";
    };

/**
 * JSON-RPC 2.0 のメッセージを標準入力(`stdin`)から受け取る.
 * @param callback
 */
const receiveJsonRpcMessage = (
  callback: (data: JsonRpcRequestOrParseError) => void
): void => {
  process.stdin.on("data", (data) => {
    callback(binaryToJsonRpcMessage(data));
  });
};

const binaryToJsonRpcMessage = (
  binary: Uint8Array
): JsonRpcRequestOrParseError => {
  try {
    return stringToJsonRpcMessage(new TextDecoder().decode(binary));
  } catch (error) {
    return { type: "error", message: "invalid UTF8", rawObject: binary };
  }
};

const stringToJsonRpcMessage = (
  message: string
): JsonRpcRequestOrParseError => {
  const headerAndBody = message.split("\r\n\r\n");
  const body = headerAndBody[1];
  if (body === undefined) {
    return {
      type: "error",
      message: "error. no body!",
      rawObject: undefined,
    };
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
    const object = jsonValue as {
      readonly id: unknown;
      readonly method: unknown;
    };
    if (object.method === "initialize" && typeof object.id === "number") {
      return {
        type: "ok",
        id: object.id,
        method: "initialize",
      };
    }
    return { type: "error", message: "unknown method...", rawObject: object };
  } catch (error: unknown) {
    return {
      type: "error",
      message: `error. body is not valid json.`,
      rawObject: message,
    };
  }
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
      readonly result: { readonly capabilities: Record<never, never> };
    };

/**
 * JSON-RPC 2.0 でメッセージを標準出力(`stdout`) に送る
 */
const sendJsonRpcMessage = (message: JsonRpcResponse) => {
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
