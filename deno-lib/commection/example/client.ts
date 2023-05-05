import { RequestExpr, typeAssert } from "../requestExpr.ts";

export const hello: RequestExpr<string> = typeAssert<string>({
  type: "call",
  functionId: "1a63a4d1a7e2404fa49d7a3cef82fa13",
  arguments: [],
});
