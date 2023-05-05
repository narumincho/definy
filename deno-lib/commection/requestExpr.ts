export type RequestExpr<T> = UntypedRequestExpr & { __typeBlend: T };

export type UntypedRequestExpr = {
  readonly type: "call";
  readonly functionId: string;
  readonly arguments: ReadonlyArray<RequestExpr<unknown>>;
} | {
  readonly type: "textLiteral";
  readonly value: string;
};
