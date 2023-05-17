import { RequestExpr, typeAssert } from "../core/requestExpr.ts";
import { ServerKey } from "./schema.ts";

export const hello: RequestExpr<ServerKey, string> = typeAssert<
  ServerKey,
  string
>({
  type: "call",
  functionName: "hello",
  arguments: [],
});
