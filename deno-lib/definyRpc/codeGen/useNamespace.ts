import { TsExpr } from "../../jsTs/data.ts";
import { arrayLiteral, stringLiteral } from "../../jsTs/interface.ts";
import { CodeGenContext } from "../core/collectType.ts";
import { Namespace } from "../core/coreType.ts";
import { useTag } from "./typeVariable/use.ts";

export const namespaceToNamespaceExpr = (
  namespace: Namespace,
  context: CodeGenContext,
): TsExpr => {
  return useTag(
    Namespace.coreType,
    "Namespace",
    context,
    namespace.type,
    namespace.type === "local"
      ? arrayLiteral(
        namespace.value.map((v) => ({
          expr: stringLiteral(v),
          spread: false,
        })),
      )
      : undefined,
  );
};
