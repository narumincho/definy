import * as d from "../localData";
import * as util from "./util";

/**
 * 指定した型の定義が正しくできているか調べる
 * @throws 型の定義が正しくできていない場合
 * @returns 型パラメーターまで含めたTypePartの名前の辞書
 */
export const checkTypePartListValidation = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): void => {
  const typeNameSet = new Set<string>();
  const typePartIdSet = new Set<d.TypePartId>();
  for (const [typePartId, typePart] of typePartMap) {
    if (typePartIdSet.has(typePartId)) {
      throw new Error(
        "duplicate type part id. typePartId = " +
          (typePartId as string) +
          " typePart = " +
          JSON.stringify(typePart)
      );
    }
    typePartIdSet.add(typePartId);
    if (util.isValidTypePartName(typePart.name)) {
      throw new Error("type part name is invalid. name = " + typePart.name);
    }
    if (typeNameSet.has(typePart.name)) {
      throw new Error("duplicate type part name. name =" + typePart.name);
    }
    typeNameSet.add(typePart.name);

    const typeParameterNameSet: Set<string> = new Set();
    for (const typeParameter of typePart.dataTypeParameterList) {
      if (typeParameterNameSet.has(typeParameter.name)) {
        throw new Error(
          `duplicate type parameter name. name = ${typeParameter.name} , in ${typePart.name}`
        );
      }
      typeParameterNameSet.add(typeParameter.name);
      if (!util.isFirstLowerCaseName(typeParameter.name)) {
        throw new Error(
          `type parameter name is invalid. name = ${typeParameter.name} , in ${typePart.name}`
        );
      }
    }
  }

  for (const typePart of typePartMap.values()) {
    checkTypePartBodyValidation(
      typePart.body,
      typePartMap,
      typePart.dataTypeParameterList.length,
      typePart.name
    );
  }
};

const checkTypePartBodyValidation = (
  typePartBody: d.TypePartBody,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number,
  typePartName: string
): void => {
  switch (typePartBody._) {
    case "Product":
      checkProductTypeValidation(
        typePartBody.memberList,
        typePartMap,
        scopeDataTypeParamterSize,
        typePartName
      );
      return;
    case "Sum":
      checkSumTypeValidation(
        typePartBody.patternList,
        typePartMap,
        scopeDataTypeParamterSize,
        typePartName
      );
  }
};

const checkProductTypeValidation = (
  memberList: ReadonlyArray<d.Member>,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number,
  typePartName: string
): void => {
  const memberNameSet: Set<string> = new Set();
  for (const member of memberList) {
    if (memberNameSet.has(member.name)) {
      throw new Error(
        `duplicate member name. name = ${member.name} in ${typePartName}. メンバー名が重複しています`
      );
    }
    memberNameSet.add(member.name);

    if (!util.isFirstLowerCaseName(member.name)) {
      throw new Error(
        `member name is invalid. name = ${member.name} in ${typePartName}. メンバー名が不正です`
      );
    }
    checkTypeValidation(member.type, typePartMap, scopeDataTypeParamterSize);
  }
};

const checkSumTypeValidation = (
  patternList: ReadonlyArray<d.Pattern>,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number,
  typePartName: string
): void => {
  const tagNameSet: Set<string> = new Set();
  for (const pattern of patternList) {
    if (tagNameSet.has(pattern.name)) {
      throw new Error(
        `duplicate tag name. name = ${pattern.name} in ${typePartName}. タグ名が重複しています`
      );
    }
    tagNameSet.add(pattern.name);

    if (!util.isFirstUpperCaseName(pattern.name)) {
      throw new Error(
        `tag name is invalid. name = ${pattern.name} in ${typePartName}. タグ名が不正です`
      );
    }
    if (pattern.parameter._ === "Just") {
      checkTypeValidation(
        pattern.parameter.value,
        typePartMap,
        scopeDataTypeParamterSize
      );
    }
  }
};

const checkTypeValidation = (
  type: d.Type,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number
): void => {
  if (type.input._ === "Just") {
    validateDataTypeOrDataTypeParamter(
      type.input.value,
      typePartMap,
      scopeDataTypeParamterSize
    );
  }
  validateDataTypeOrDataTypeParamter(
    type.output,
    typePartMap,
    scopeDataTypeParamterSize
  );
};

const validateDataTypeOrDataTypeParamter = (
  dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number
): void => {
  switch (dataTypeOrDataTypeParameter._) {
    case "DataType": {
      validateDataType(
        dataTypeOrDataTypeParameter.dataType,
        typePartMap,
        scopeDataTypeParamterSize
      );
      return;
    }

    case "DataTypeParameter": {
      if (dataTypeOrDataTypeParameter.int32 < 0) {
        throw new Error(
          `dataTypeParameterIndex is < 0. index = ${dataTypeOrDataTypeParameter.int32}`
        );
      }
      if (scopeDataTypeParamterSize <= dataTypeOrDataTypeParameter.int32) {
        throw new Error(
          `scopeDataTypeParamterSize = ${scopeDataTypeParamterSize}, but use =${dataTypeOrDataTypeParameter.int32}`
        );
      }
    }
  }
};

const validateDataType = (
  dataType: d.DataType,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number
): void => {
  const typePart = typePartMap.get(dataType.typePartId);
  if (typePart === undefined) {
    throw new Error(`not found typePartId = ${dataType.typePartId}`);
  }

  if (typePart.dataTypeParameterList.length !== dataType.arguments.length) {
    throw new Error(
      `type parameter size not match. type part need ${typePart.dataTypeParameterList.length}. but use ${dataType.arguments.length} parameter(s). typePartId = ${dataType.typePartId}`
    );
  }
  for (const argument of dataType.arguments) {
    validateDataTypeOrDataTypeParamter(
      argument,
      typePartMap,
      scopeDataTypeParamterSize
    );
  }
};
