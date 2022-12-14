import {
  data,
  identifierFromString,
  lambdaToType,
  memberKeyValue,
  objectLiteral,
  stringLiteral,
  symbolToStringTag,
  variable,
} from "../../../jsTs/main.ts";
import { CodeGenContext } from "../../core/collectType.ts";
import { DefinyRpcTypeInfo, Pattern } from "../../core/coreType.ts";
import {
  collectedDefinyRpcTypeToTsType,
  collectedDefinyRpcTypeUseToTsType,
} from "../type/use.ts";
import { symbolToStringTagAndTypeName } from "./from.ts";

type TsMemberAndType = {
  readonly member: data.TsMember;
  readonly memberType: data.TsMemberType;
};

export const createTagExprList = (
  type: DefinyRpcTypeInfo,
  context: CodeGenContext,
):
  | ReadonlyArray<TsMemberAndType>
  | undefined => {
  if (type.body.type !== "sum") {
    return undefined;
  }
  return type.body.value.map<TsMemberAndType>(
    (pattern): TsMemberAndType => {
      const exprAndType = patternToTagExprAndType(pattern, type, context);
      return {
        member: memberKeyValue(pattern.name, exprAndType.memberExpr),
        memberType: {
          name: { type: "string", value: pattern.name },
          document: pattern.description,
          required: true,
          type: exprAndType.type,
        },
      };
    },
  );
};

const patternToTagExprAndType = (
  pattern: Pattern,
  type: DefinyRpcTypeInfo,
  context: CodeGenContext,
): {
  readonly memberExpr: data.TsExpr;
  readonly type: data.TsType;
} => {
  const symbolToStringTagMember: data.TsMember = {
    _: "KeyValue",
    keyValue: {
      key: symbolToStringTag,
      value: stringLiteral(
        symbolToStringTagAndTypeName(type.namespace, type.name),
      ),
    },
  };
  if (type.parameter.length === 0 && pattern.parameter.type === "nothing") {
    return {
      memberExpr: objectLiteral([
        memberKeyValue("type", stringLiteral(pattern.name)),
        symbolToStringTagMember,
      ]),
      type: collectedDefinyRpcTypeToTsType(type, context),
    };
  }
  const lambdaExpr: data.LambdaExpr = {
    parameterList: pattern.parameter.type === "nothing" ? [] : [{
      name: identifierFromString("p"),
      type: collectedDefinyRpcTypeUseToTsType(pattern.parameter.value, context),
    }],
    returnType: collectedDefinyRpcTypeToTsType(type, context),
    statementList: [{
      _: "Return",
      tsExpr: objectLiteral([
        memberKeyValue("type", stringLiteral(pattern.name)),
        ...(pattern.parameter.type === "just"
          ? [memberKeyValue("value", variable(identifierFromString("p")))]
          : []),
        symbolToStringTagMember,
      ]),
    }],
    typeParameterList: type.parameter.map((parameter) =>
      identifierFromString(parameter.name)
    ),
  };
  return {
    memberExpr: { _: "Lambda", lambdaExpr },
    type: lambdaToType(lambdaExpr),
  };
};
