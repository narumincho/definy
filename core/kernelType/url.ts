import * as c from "./codec";
import * as identifer from "../../gen/jsTs/identifer";
import * as string from "./string";
import * as ts from "../../data";
import * as tsUtil from "../../gen/jsTs/util";
import * as util from "../util";

const name = identifer.fromString("Url");

export const type = ts.TsType.ScopeInGlobal(name);

export const encodeDefinitionStatementList = (
  valueVar: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  return [
    ts.Statement.Return(
      util.callEncode(
        string.codec(),
        tsUtil.callMethod(valueVar, "toString", [])
      )
    ),
  ];
};

export const decodeDefinitionStatementList = (
  parameterIndex: ts.TsExpr,
  parameterBinary: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const resultAndNextIndexAsStringName = identifer.fromString(
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
        expr: ts.TsExpr.GlobalObjects(identifer.fromString("URL")),
        parameterList: [c.getResult(resultAndNextIndexAsStringVar)],
      }),
      c.getNextIndex(resultAndNextIndexAsStringVar)
    ),
  ];
};
