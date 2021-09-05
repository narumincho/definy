import * as d from "../../localData";
import { jsTs } from "../../gen/main";

const typePartIdPropertyName = "typePartId";

export const typePartIdMemberType: d.TsMemberType = {
  name: typePartIdPropertyName,
  required: true,
  type: d.TsType.ScopeInFile(jsTs.identifierFromString("TypePartId")),
  document: "definy.app 内 の 型パーツの Id",
};

export const typePartIdMember = (typePartId: d.TypePartId): d.TsMember =>
  d.TsMember.KeyValue({
    key: typePartIdPropertyName,
    value: d.TsExpr.TypeAssertion(
      d.TypeAssertion.helper({
        expr: d.TsExpr.StringLiteral(typePartId),
        type: d.TsType.ScopeInFile(jsTs.identifierFromString("TypePartId")),
      })
    ),
  });
