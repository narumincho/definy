export type RequestExpr<T> = UntypedRequestExpr & { __typeBlend: T };

export const typeAssert = <T>(
  untypedRequestExpr: UntypedRequestExpr,
): RequestExpr<T> => untypedRequestExpr as RequestExpr<T>;

export type UntypedRequestExpr = {
  readonly type: "call";
  readonly functionName: string;
  readonly arguments: ReadonlyArray<RequestExpr<unknown>>;
} | {
  readonly type: "textLiteral";
  readonly value: string;
};
