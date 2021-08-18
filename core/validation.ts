import * as d from "../localData";
import * as util from "./util";
import type { TypePartIdAndMessage } from "./TypePartIdAndMessage";

/**
 * 指定した型の定義が正しくできているか調べる
 * @throws 型の定義が正しくできていない場合
 * @returns 型パラメーターまで含めたTypePartの名前の辞書
 */
export const checkTypePartListValidation = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): ReadonlyArray<TypePartIdAndMessage> => {
  const typePartNameSet = new Set<string>();
  const typePartIdSet = new Set<d.TypePartId>();
  return [...typePartMap.values()].flatMap(
    (typePart): ReadonlyArray<TypePartIdAndMessage> => {
      if (typePartIdSet.has(typePart.id)) {
        return [
          {
            message: "duplicate type part id.",
            typePartId: typePart.id,
          },
        ];
      }
      typePartIdSet.add(typePart.id);
      const nameResult = checkTypePartNameValidation(
        typePart.name,
        typePartNameSet
      );
      if (typeof nameResult === "string") {
        return [{ message: nameResult, typePartId: typePart.id }];
      }
      typePartNameSet.add(typePart.name);

      return [
        ...checkTypePartTypeParameterValidation(
          typePart.dataTypeParameterList
        ).map((message) => ({ message, typePartId: typePart.id })),
        ...checkTypePartBodyValidation(
          typePart.body,
          typePartMap,
          typePart.dataTypeParameterList.length,
          typePart.name
        ).map((message) => ({ message, typePartId: typePart.id })),
      ];
    }
  );
};

const checkTypePartNameValidation = (
  name: string,
  nameSet: ReadonlySet<string>
): string | undefined => {
  if (util.isValidTypePartName(name)) {
    return "type part name is invalid. name = " + name;
  }
  if (nameSet.has(name)) {
    return "duplicate type part name. name =" + name;
  }
};

const checkTypePartTypeParameterValidation = (
  dataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): ReadonlyArray<string> => {
  const typeParameterNameSet: Set<string> = new Set();
  return dataTypeParameterList.flatMap((typeParameter) => {
    if (typeParameterNameSet.has(typeParameter.name)) {
      return [`duplicate type parameter name. name = ${typeParameter.name}`];
    }
    typeParameterNameSet.add(typeParameter.name);
    if (!util.isFirstLowerCaseName(typeParameter.name)) {
      return [`type parameter name is invalid. name = ${typeParameter.name}`];
    }
    return [];
  });
};

const checkTypePartBodyValidation = (
  typePartBody: d.TypePartBody,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number,
  typePartName: string
): ReadonlyArray<string> => {
  switch (typePartBody._) {
    case "Product":
      return checkProductTypeValidation(
        typePartBody.memberList,
        typePartMap,
        scopeDataTypeParamterSize,
        typePartName
      );
    case "Sum":
      return checkSumTypeValidation(
        typePartBody.patternList,
        typePartMap,
        scopeDataTypeParamterSize,
        typePartName
      );
    case "Kernel":
      return [];
  }
};

const checkProductTypeValidation = (
  memberList: ReadonlyArray<d.Member>,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number,
  typePartName: string
): ReadonlyArray<string> => {
  const memberNameSet: Set<string> = new Set();
  return memberList.flatMap((member): ReadonlyArray<string> => {
    if (memberNameSet.has(member.name)) {
      return [
        `duplicate member name. name = ${member.name} in ${typePartName}. メンバー名が重複しています`,
      ];
    }
    memberNameSet.add(member.name);

    if (!util.isFirstLowerCaseName(member.name)) {
      return [
        `member name is invalid. name = ${member.name} in ${typePartName}. メンバー名が不正です`,
      ];
    }
    return checkTypeValidation(
      member.type,
      typePartMap,
      scopeDataTypeParamterSize
    );
  });
};

const checkSumTypeValidation = (
  patternList: ReadonlyArray<d.Pattern>,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number,
  typePartName: string
): ReadonlyArray<string> => {
  const tagNameSet: Set<string> = new Set();
  return patternList.flatMap((pattern): ReadonlyArray<string> => {
    if (tagNameSet.has(pattern.name)) {
      return [
        `duplicate tag name. name = ${pattern.name} in ${typePartName}. タグ名が重複しています`,
      ];
    }
    tagNameSet.add(pattern.name);

    if (!util.isFirstUpperCaseName(pattern.name)) {
      return [
        `tag name is invalid. name = ${pattern.name} in ${typePartName}. タグ名が不正です`,
      ];
    }
    if (pattern.parameter._ === "Just") {
      return checkTypeValidation(
        pattern.parameter.value,
        typePartMap,
        scopeDataTypeParamterSize
      );
    }
    return [];
  });
};

const checkTypeValidation = (
  type: d.Type,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number
): ReadonlyArray<string> => {
  if (type.input._ === "Just") {
    return [
      ...validateDataTypeOrDataTypeParamter(
        type.input.value,
        typePartMap,
        scopeDataTypeParamterSize
      ),
      ...validateDataTypeOrDataTypeParamter(
        type.output,
        typePartMap,
        scopeDataTypeParamterSize
      ),
    ];
  }
  return validateDataTypeOrDataTypeParamter(
    type.output,
    typePartMap,
    scopeDataTypeParamterSize
  );
};

const validateDataTypeOrDataTypeParamter = (
  dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number
): ReadonlyArray<string> => {
  switch (dataTypeOrDataTypeParameter._) {
    case "DataType": {
      const dataTypeResult = validateDataType(
        dataTypeOrDataTypeParameter.dataType,
        typePartMap,
        scopeDataTypeParamterSize
      );
      if (typeof dataTypeResult === "string") {
        return [dataTypeResult];
      }
      return [];
    }

    case "DataTypeParameter": {
      if (dataTypeOrDataTypeParameter.int32 < 0) {
        return [
          `dataTypeParameterIndex is < 0. index = ${dataTypeOrDataTypeParameter.int32}`,
        ];
      }
      if (scopeDataTypeParamterSize <= dataTypeOrDataTypeParameter.int32) {
        return [
          `scopeDataTypeParamterSize = ${scopeDataTypeParamterSize}, but use =${dataTypeOrDataTypeParameter.int32}`,
        ];
      }
      return [];
    }
  }
};

const validateDataType = (
  dataType: d.DataType,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeDataTypeParamterSize: number
): string | undefined => {
  const typePart = typePartMap.get(dataType.typePartId);
  if (typePart === undefined) {
    return `not found typePartId = ${dataType.typePartId}`;
  }

  if (typePart.dataTypeParameterList.length !== dataType.arguments.length) {
    return `type parameter size not match. type part need ${typePart.dataTypeParameterList.length}. but use ${dataType.arguments.length} parameter(s). typePartId = ${dataType.typePartId}`;
  }
  for (const argument of dataType.arguments) {
    validateDataTypeOrDataTypeParamter(
      argument,
      typePartMap,
      scopeDataTypeParamterSize
    );
  }
};
