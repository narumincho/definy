// ブラウザとか関係なしにリクエストするためのクライアント

import { RequestExpr, typeAssert } from "../requestExpr.ts";

export const textLiteral = (value: string): RequestExpr<string> =>
  typeAssert<string>({
    type: "textLiteral",
    value,
  });

export const request = async <T>(
  requestExpr: RequestExpr<T>,
): Promise<Result<T>> => {
  await fetch("", { body: requestExpr.toString() });
  return {
    type: "ok",
  };
};

export type Result<T> = {
  readonly type: "ok";
};
