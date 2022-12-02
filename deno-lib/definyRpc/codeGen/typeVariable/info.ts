import {
  data,
  memberKeyValue,
  objectLiteral,
  stringLiteral,
} from "../../../jsTs/main.ts";
import {
  CodeGenContext,
  CollectedDefinyRpcType,
} from "../../core/collectType.ts";

export const createFromLambda = (
  type: CollectedDefinyRpcType,
  context: CodeGenContext,
): data.TsExpr => {
  switch (type.body.type) {
    case "string":
      return objectLiteral([memberKeyValue("name", stringLiteral(type.name))]);
  }
};
