import {
  data,
  identifierFromString,
  lambdaToType,
  memberKeyValue,
  objectLiteral,
  stringLiteral,
  variable,
} from "../../../jsTs/main.ts";
import { arrayFromLength } from "../../../util.ts";
import {
  CodeGenContext,
  CollectedDefinyRpcType,
  Pattern,
} from "../../core/collectType.ts";
import {
  collectedDefinyRpcTypeToTsType,
  collectedDefinyRpcTypeUseToTsType,
} from "../type/use.ts";

type TsMemberAndType = {
  readonly member: data.TsMember;
  readonly memberType: data.TsMemberType;
};

export const createTagExprList = (
  type: CollectedDefinyRpcType,
  context: CodeGenContext,
):
  | ReadonlyArray<TsMemberAndType>
  | undefined => {
  if (type.body.type !== "sum") {
    return undefined;
  }
  return type.body.patternList.map<TsMemberAndType>(
    (pattern): TsMemberAndType => {
      const exprAndType = patternToTagExprAndType(pattern, type, context);
      return {
        member: memberKeyValue(pattern.name, exprAndType.memberExpr),
        memberType: {
          name: { type: "string", value: identifierFromString(pattern.name) },
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
  type: CollectedDefinyRpcType,
  context: CodeGenContext,
): {
  readonly memberExpr: data.TsExpr;
  readonly type: data.TsType;
} => {
  if (type.parameterCount === 0 && pattern.parameter === undefined) {
    return {
      memberExpr: objectLiteral([
        memberKeyValue("type", stringLiteral(pattern.name)),
      ]),
      type: collectedDefinyRpcTypeToTsType(type, context),
    };
  }
  const lambdaExpr: data.LambdaExpr = {
    parameterList: pattern.parameter === undefined ? [] : [{
      name: identifierFromString("p"),
      type: collectedDefinyRpcTypeUseToTsType(pattern.parameter, context),
    }],
    returnType: collectedDefinyRpcTypeToTsType(type, context),
    statementList: [{
      _: "Return",
      tsExpr: objectLiteral([
        memberKeyValue("type", stringLiteral(pattern.name)),
        memberKeyValue("value", variable(identifierFromString("p"))),
      ]),
    }],
    typeParameterList: arrayFromLength(
      type.parameterCount,
      (i) => identifierFromString("p" + i),
    ),
  };
  return {
    memberExpr: { _: "Lambda", lambdaExpr },
    type: lambdaToType(lambdaExpr),
  };
};
