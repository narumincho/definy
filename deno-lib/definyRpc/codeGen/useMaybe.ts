import {
  data,
  memberKeyValue,
  objectLiteral,
  stringLiteral,
} from "../../jsTs/main.ts";

export const just = (expr: data.TsExpr): data.TsExpr =>
  objectLiteral([
    memberKeyValue("type", stringLiteral("just")),
    memberKeyValue("value", expr),
  ]);

export const nothing: data.TsExpr = objectLiteral([
  memberKeyValue("type", stringLiteral("nothing")),
]);
