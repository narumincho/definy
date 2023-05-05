// ブラウザとか関係なしにリクエストするためのクライアント

import { RequestExpr } from "../requestExpr.ts";

export const textLiteral = (value: string): RequestExpr<string> => ({
  type: "textLiteral",
  value,
});

export const request = async <T>(
  requestExpr: RequestExpr<T>,
): Promise<Result<T>> => {
  await fetch("");
};

export type Result<T> = {};
