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
  await fetch("");
  return {};
};

export type Result<T> = {};
