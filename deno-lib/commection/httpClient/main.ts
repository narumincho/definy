// ブラウザとか関係なしにリクエストするためのクライアント

import { RequestExpr, typeAssert } from "../core/requestExpr.ts";

export const textLiteral = <ServerKey>(
  value: string,
): RequestExpr<ServerKey, string> =>
  typeAssert<ServerKey, string>({
    type: "textLiteral",
    value,
  });

export const request = async <ServerKey, T>(
  requestExpr: RequestExpr<ServerKey, T>,
): Promise<Result<T>> => {
  await fetch("", { body: requestExpr.toString() });
  return {
    type: "ok",
  };
};

export type Result<T> = {
  readonly type: "ok";
};
