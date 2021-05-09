import * as c from "./codec";
import * as string from "./string";
import * as ts from "../../data";
import * as util from "../util";
import { jsTs } from "../../gen/main";

const name = jsTs.identiferFromString("Url");

export const type = ts.TsType.ScopeInGlobal(name);

export const encodeDefinitionStatementList = (
  valueVar: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  return [
    ts.Statement.Return(
      util.callEncode(string.codec(), jsTs.callMethod(valueVar, "toString", []))
    ),
  ];
};

export const decodeDefinitionStatementList = (
  parameterIndex: ts.TsExpr,
  parameterBinary: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const resultAndNextIndexAsStringName = jsTs.identiferFromString(
    "resultAndNextIndexAsString"
  );
  const resultAndNextIndexAsStringVar = ts.TsExpr.Variable(
    resultAndNextIndexAsStringName
  );
  return [
    ts.Statement.VariableDefinition({
      isConst: true,
      name: resultAndNextIndexAsStringName,
      type: c.decodeReturnType(string.type),
      expr: util.callDecode(string.codec(), parameterIndex, parameterBinary),
    }),
    c.returnStatement(
      ts.TsExpr.New({
        expr: ts.TsExpr.GlobalObjects(jsTs.identiferFromString("URL")),
        parameterList: [c.getResult(resultAndNextIndexAsStringVar)],
      }),
      c.getNextIndex(resultAndNextIndexAsStringVar)
    ),
  ];
};
