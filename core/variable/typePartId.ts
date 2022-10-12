import * as d from "../../localData";
import { jsTs } from "../../deno-lib/npm";

const typePartIdPropertyName = "typePartId";

export const typePartIdMemberType: jsTs.data.TsMemberType = {
  name: typePartIdPropertyName,
  required: true,
  type: {
    _: "ScopeInFile",
    typeNameAndTypeParameter: {
      name: jsTs.identifierFromString("TypePartId"),
      arguments: [],
    },
  },
  document: "definy.app 内 の 型パーツの Id",
};

export const typePartIdMember = (
  typePartId: d.TypePartId
): jsTs.data.TsMember =>
  jsTs.memberKeyValue(typePartIdPropertyName, {
    _: "TypeAssertion",
    typeAssertion: {
      expr: { _: "StringLiteral", string: typePartId },
      type: {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: jsTs.identifierFromString("TypePartId"),
          arguments: [],
        },
      },
    },
  });
