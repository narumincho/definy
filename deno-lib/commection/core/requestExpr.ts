export type RequestExpr<Server, ResponseType> = UntypedRequestExpr & {
  __ServerTypeBland: Server;
  __ResponseTypeBlend: ResponseType;
};

export const typeAssert = <Server, ResponseType>(
  untypedRequestExpr: UntypedRequestExpr,
): RequestExpr<Server, ResponseType> =>
  untypedRequestExpr as RequestExpr<Server, ResponseType>;

export type UntypedRequestExpr = {
  readonly type: "call";
  readonly functionName: string;
  readonly arguments: ReadonlyArray<RequestExpr<unknown, unknown>>;
} | {
  readonly type: "textLiteral";
  readonly value: string;
};
