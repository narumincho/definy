import {
  data,
  memberKeyValue,
  objectLiteral,
  stringLiteral,
} from "../../jsTs/main.ts";
import { CodeGenContext } from "../core/collectType.ts";
import { Namespace } from "../core/coreType.ts";
import { useTag } from "./typeVariable/use.ts";

export const just = (
  expr: data.TsExpr,
  context: CodeGenContext,
): data.TsExpr => {
  return useTag(Namespace.coreType, "Maybe", context, "just", expr);
};

export const nothing = (context: CodeGenContext): data.TsExpr => {
  return useTag(Namespace.coreType, "Maybe", context, "nothing", undefined);
};
