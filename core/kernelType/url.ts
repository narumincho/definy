import * as c from "./codec";
import * as string from "./string";
import * as util from "../util";
import { jsTs } from "../../deno-lib/npm";

const name = jsTs.identifierFromString("Url");

export const type: jsTs.data.TsType = {
  _: "ScopeInGlobal",
  typeNameAndTypeParameter: { name, arguments: [] },
};

export const encodeDefinitionStatementList = (
  valueVar: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  return [
    jsTs.statementReturn(
      util.callEncode(string.codec(), jsTs.callMethod(valueVar, "toString", []))
    ),
  ];
};

export const decodeDefinitionStatementList = (
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const resultAndNextIndexAsStringName = jsTs.identifierFromString(
    "resultAndNextIndexAsString"
  );
  const resultAndNextIndexAsStringVar = jsTs.variable(
    resultAndNextIndexAsStringName
  );
  return [
    jsTs.statementVariableDefinition({
      isConst: true,
      name: resultAndNextIndexAsStringName,
      type: c.decodeReturnType(string.type),
      expr: util.callDecode(string.codec(), parameterIndex, parameterBinary),
    }),
    c.returnStatement(
      jsTs.newURL(c.getResult(resultAndNextIndexAsStringVar)),
      c.getNextIndex(resultAndNextIndexAsStringVar)
    ),
  ];
};
