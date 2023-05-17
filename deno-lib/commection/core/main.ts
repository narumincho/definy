import { RequestExpr } from "./requestExpr.ts";
import { SchemaType } from "./schemaType.ts";

export type Server<ImplementType, ServerKey> = {
  readonly schema: SchemaType<ImplementType>;
  readonly implementation: ImplementType;
  readonly serverKey: ServerKey;
};

export type Result<T> = {
  readonly type: "ok";
  readonly value: T;
} | {
  readonly type: "error";
};

/**
 * サーバーないで呼ぶためのインターフェース
 * SSR とかで使う
 */
export const executeCommand = async <ImplementType, ServerKey, ResponseType>(
  _server: Server<ImplementType, ServerKey>,
  _request: RequestExpr<ServerKey, ResponseType>,
): Promise<Result<ResponseType>> => {
  await (() => {});
  return {
    type: "error",
  };
};

/**
 * 開発時のみ import できるように分割
 * Deno.writeTextFile でファイルを書き出すため Deno でのみ動く
 * Node.js 向け(npm) には別の関数を用意するか dnt で変換する
 */
export const generateCode = async <ImplementType, CommandType>(
  server: Server<ImplementType, CommandType>,
): Promise<void> => {
  await Deno.writeTextFile("./test", `未実装\n${server}`);
};
