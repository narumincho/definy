import * as d from "../../localData";
import * as util from "../util";
import { jsTs } from "../../gen/main";

/** 直和型の指定を簡単にする関数や定数の型を生成する */
export const typePartSumTagType = (
  typePart: d.TypePart,
  patternList: ReadonlyArray<d.Pattern>,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): ReadonlyArray<d.TsMemberType> => {
  return patternList.map(
    (pattern): d.TsMemberType => ({
      name: pattern.name,
      required: true,
      type: patternToTagType(
        jsTs.identiferFromString(typePart.name),
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
  typeName: d.TsIdentifier,
  typeParameterList: ReadonlyArray<d.DataTypeParameter>,
  pattern: d.Pattern,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
) => {
  const typeParameterIdentiferList = typeParameterList.map((typeParameter) =>
    jsTs.identiferFromString(typeParameter.name)
  );
  const returnType = d.TsType.WithTypeParameter({
    type: d.TsType.ScopeInFile(typeName),
    typeParameterList: typeParameterIdentiferList.map(
      (typeParameterIdentifer) => d.TsType.ScopeInFile(typeParameterIdentifer)
    ),
  });

  switch (pattern.parameter._) {
    case "Just":
      return d.TsType.Function({
        typeParameterList: typeParameterIdentiferList,
        parameterList: [
          util.typeToTsType(
            pattern.parameter.value,
            typePartMap,
            scopeTypePartDataTypeParameterList
          ),
        ],
        return: returnType,
      });

    case "Nothing":
      if (typeParameterList.length === 0) {
        return returnType;
      }
      return d.TsType.Function({
        typeParameterList: typeParameterIdentiferList,
        parameterList: [],
        return: returnType,
      });
  }
};

/** 直和型の指定を簡単にする関数や定数の式を生成する */
export const typePartSumTagExpr = (
  typePart: d.TypePart,
  patternList: ReadonlyArray<d.Pattern>,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): ReadonlyArray<d.TsMember> => {
  return patternList.map((pattern, index) =>
    d.TsMember.KeyValue({
      key: pattern.name,
      value: patternToTagExpr(
        typePart,
        patternList,
        pattern,
        index,
        typePartMap
      ),
    })
  );
};

const patternToTagExpr = (
  typePart: d.TypePart,
  patternList: ReadonlyArray<d.Pattern>,
  pattern: d.Pattern,
  patternIndex: number,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.TsExpr => {
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
    return d.TsExpr.StringLiteral(pattern.name);
  }
  return patternWithParameterToTagExpr(typePart, pattern, typePartMap);
};

const patternWithAttributeToTagExpr = (
  typePart: d.TypePart,
  pattern: d.Pattern,
  patternIndex: number,
  attribute: d.TypeAttribute,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.TsExpr => {
  switch (attribute) {
    case "AsBoolean":
      return d.TsExpr.BooleanLiteral(patternIndex !== 0);
    case "AsUndefined":
      return d.TsExpr.UndefinedLiteral;
    case "AsNumber": {
      if (pattern.parameter._ === "Nothing") {
        throw new Error("AsNumber need parameter type");
      }
      const parameterIdentifer = jsTs.identiferFromString(
        util.typeToMemberOrParameterName(
          pattern.parameter.value,
          typePartMap,
          typePart.dataTypeParameterList
        )
      );
      const returnType = d.TsType.WithTypeParameter({
        type: d.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
        typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
          d.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
        ),
      });
      return d.TsExpr.Lambda({
        typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
          jsTs.identiferFromString(typeParameter.name)
        ),
        parameterList: [
          {
            name: parameterIdentifer,
            type: util.typeToTsType(
              pattern.parameter.value,
              typePartMap,
              typePart.dataTypeParameterList
            ),
          },
        ],
        returnType,
        statementList: [
          d.Statement.Return(
            d.TsExpr.TypeAssertion({
              expr: d.TsExpr.Variable(parameterIdentifer),
              type: returnType,
            })
          ),
        ],
      });
    }
  }
};

const patternWithParameterToTagExpr = (
  typePart: d.TypePart,
  pattern: d.Pattern,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.TsExpr => {
  const tagMember: d.TsMember = d.TsMember.KeyValue({
    key: "_",
    value: d.TsExpr.StringLiteral(pattern.name),
  });
  const returnType = d.TsType.WithTypeParameter({
    type: d.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
    typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
      d.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
    ),
  });

  switch (pattern.parameter._) {
    case "Just": {
      const parameterIdentifer = jsTs.identiferFromString(
        util.typeToMemberOrParameterName(
          pattern.parameter.value,
          typePartMap,
          typePart.dataTypeParameterList
        )
      );
      return d.TsExpr.Lambda({
        typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
          jsTs.identiferFromString(typeParameter.name)
        ),
        parameterList: [
          {
            name: parameterIdentifer,
            type: util.typeToTsType(
              pattern.parameter.value,
              typePartMap,
              typePart.dataTypeParameterList
            ),
          },
        ],
        returnType,
        statementList: [
          d.Statement.Return(
            d.TsExpr.ObjectLiteral([
              tagMember,
              d.TsMember.KeyValue({
                key: util.typeToMemberOrParameterName(
                  pattern.parameter.value,
                  typePartMap,
                  typePart.dataTypeParameterList
                ),
                value: d.TsExpr.Variable(parameterIdentifer),
              }),
            ])
          ),
        ],
      });
    }

    case "Nothing":
      if (typePart.dataTypeParameterList.length === 0) {
        return d.TsExpr.ObjectLiteral([tagMember]);
      }
      return d.TsExpr.Lambda({
        typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
          jsTs.identiferFromString(typeParameter.name)
        ),
        parameterList: [],
        returnType,
        statementList: [
          d.Statement.Return(d.TsExpr.ObjectLiteral([tagMember])),
        ],
      });
  }
};
