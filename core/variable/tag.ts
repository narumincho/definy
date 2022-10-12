import * as d from "../../localData";
import * as util from "../util";
import { jsTs } from "../../deno-lib/npm";

/** 直和型の指定を簡単にする関数や定数の型を生成する */
export const typePartSumTagType = (
  typePart: d.TypePart,
  patternList: ReadonlyArray<d.Pattern>,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): ReadonlyArray<jsTs.data.TsMemberType> => {
  return patternList.map(
    (pattern): jsTs.data.TsMemberType => ({
      name: pattern.name,
      required: true,
      type: patternToTagType(
        jsTs.identifierFromString(typePart.name),
        typePart.dataTypeParameterList,
        pattern,
        typePartMap,
        typePart.dataTypeParameterList
      ),
      document: pattern.description,
    })
  );
};

const patternToTagType = (
  typeName: jsTs.TsIdentifier,
  typeParameterList: ReadonlyArray<d.DataTypeParameter>,
  pattern: d.Pattern,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): jsTs.data.TsType => {
  const typeParameterIdentifierList = typeParameterList.map((typeParameter) =>
    jsTs.identifierFromString(typeParameter.name)
  );
  const returnType: jsTs.data.TsType = {
    _: "ScopeInFile",
    typeNameAndTypeParameter: {
      name: typeName,
      arguments: typeParameterIdentifierList.map((typeParameterIdentifier) =>
        jsTs.typeScopeInFileNoArguments(typeParameterIdentifier)
      ),
    },
  };

  switch (pattern.parameter._) {
    case "Just":
      return {
        _: "Function",
        functionType: {
          typeParameterList: typeParameterIdentifierList,
          parameterList: [
            util.typeToTsType(
              pattern.parameter.value,
              typePartMap,
              scopeTypePartDataTypeParameterList
            ),
          ],
          return: returnType,
        },
      };

    case "Nothing":
      if (typeParameterList.length === 0) {
        return returnType;
      }
      return {
        _: "Function",
        functionType: {
          typeParameterList: typeParameterIdentifierList,
          parameterList: [],
          return: returnType,
        },
      };
  }
};

/** 直和型の指定を簡単にする関数や定数の式を生成する */
export const typePartSumTagExpr = (
  typePart: d.TypePart,
  patternList: ReadonlyArray<d.Pattern>,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): ReadonlyArray<jsTs.data.TsMember> => {
  return patternList.map((pattern, index) =>
    jsTs.memberKeyValue(
      pattern.name,
      patternToTagExpr(typePart, patternList, pattern, index, typePartMap)
    )
  );
};

const patternToTagExpr = (
  typePart: d.TypePart,
  patternList: ReadonlyArray<d.Pattern>,
  pattern: d.Pattern,
  patternIndex: number,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): jsTs.data.TsExpr => {
  if (typePart.attribute._ === "Just") {
    return patternWithAttributeToTagExpr(
      typePart,
      pattern,
      patternIndex,
      typePart.attribute.value,
      typePartMap
    );
  }
  if (util.isTagTypeAllNoParameter(patternList)) {
    return { _: "StringLiteral", string: pattern.name };
  }
  return patternWithParameterToTagExpr(typePart, pattern, typePartMap);
};

const patternWithAttributeToTagExpr = (
  typePart: d.TypePart,
  pattern: d.Pattern,
  patternIndex: number,
  attribute: d.TypeAttribute,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): jsTs.data.TsExpr => {
  switch (attribute) {
    case "AsBoolean":
      return { _: "BooleanLiteral", bool: patternIndex !== 0 };
    case "AsUndefined":
      return { _: "UndefinedLiteral" };
    case "AsNumber": {
      if (pattern.parameter._ === "Nothing") {
        throw new Error("AsNumber need parameter type");
      }
      const parameterIdentifier = jsTs.identifierFromString(
        util.typeToMemberOrParameterName(
          pattern.parameter.value,
          typePartMap,
          typePart.dataTypeParameterList
        )
      );
      const returnType: jsTs.data.TsType = {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: jsTs.identifierFromString(typePart.name),
          arguments: typePart.dataTypeParameterList.map((typeParameter) =>
            jsTs.typeScopeInFileNoArguments(
              jsTs.identifierFromString(typeParameter.name)
            )
          ),
        },
      };
      return {
        _: "Lambda",
        lambdaExpr: {
          typeParameterList: typePart.dataTypeParameterList.map(
            (typeParameter) => jsTs.identifierFromString(typeParameter.name)
          ),
          parameterList: [
            {
              name: parameterIdentifier,
              type: util.typeToTsType(
                pattern.parameter.value,
                typePartMap,
                typePart.dataTypeParameterList
              ),
            },
          ],
          returnType,
          statementList: [
            {
              _: "Return",
              tsExpr: {
                _: "TypeAssertion",
                typeAssertion: {
                  expr: jsTs.variable(parameterIdentifier),
                  type: returnType,
                },
              },
            },
          ],
        },
      };
    }
  }
};

const patternWithParameterToTagExpr = (
  typePart: d.TypePart,
  pattern: d.Pattern,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): jsTs.data.TsExpr => {
  const tagMember = jsTs.memberKeyValue("_", {
    _: "StringLiteral",
    string: pattern.name,
  });
  const returnType: jsTs.data.TsType = {
    _: "ScopeInFile",
    typeNameAndTypeParameter: {
      name: jsTs.identifierFromString(typePart.name),
      arguments: typePart.dataTypeParameterList.map((typeParameter) =>
        jsTs.typeScopeInFileNoArguments(
          jsTs.identifierFromString(typeParameter.name)
        )
      ),
    },
  };

  switch (pattern.parameter._) {
    case "Just": {
      const parameterIdentifier = jsTs.identifierFromString(
        util.typeToMemberOrParameterName(
          pattern.parameter.value,
          typePartMap,
          typePart.dataTypeParameterList
        )
      );
      return {
        _: "Lambda",
        lambdaExpr: {
          typeParameterList: typePart.dataTypeParameterList.map(
            (typeParameter) => jsTs.identifierFromString(typeParameter.name)
          ),
          parameterList: [
            {
              name: parameterIdentifier,
              type: util.typeToTsType(
                pattern.parameter.value,
                typePartMap,
                typePart.dataTypeParameterList
              ),
            },
          ],
          returnType,
          statementList: [
            {
              _: "Return",
              tsExpr: jsTs.objectLiteral([
                tagMember,
                jsTs.memberKeyValue(
                  util.typeToMemberOrParameterName(
                    pattern.parameter.value,
                    typePartMap,
                    typePart.dataTypeParameterList
                  ),
                  jsTs.variable(parameterIdentifier)
                ),
              ]),
            },
          ],
        },
      };
    }

    case "Nothing":
      if (typePart.dataTypeParameterList.length === 0) {
        return jsTs.objectLiteral([tagMember]);
      }
      return {
        _: "Lambda",
        lambdaExpr: {
          typeParameterList: typePart.dataTypeParameterList.map(
            (typeParameter) => jsTs.identifierFromString(typeParameter.name)
          ),
          parameterList: [],
          returnType,
          statementList: [
            { _: "Return", tsExpr: jsTs.objectLiteral([tagMember]) },
          ],
        },
      };
  }
};
