import { RequestExpr, typeAssert } from "../requestExpr.ts";

export const hello: RequestExpr<string> = typeAssert<string>({
  type: "call",
  functionName: "hello",
  arguments: [],
});
