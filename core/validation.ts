import * as d from "../localData";
import * as util from "./util";

/**
 * バリデーションした結果.
 * 型パラメータ名を取得する時に必要になるため (構造変更する予定によりこれは不要になる)
 */
export type TypePartData =
  | {
      readonly tag: "typePart";
      readonly typePart: d.TypePart;
    }
  | {
      readonly tag: "dataTypeParameter";
      readonly name: string;
    };

/**
 * 指定した型の定義が正しくできているか調べる
 * @throws 型の定義が正しくできていない場合
 * @returns 型パラメーターまで含めたTypePartの名前の辞書
 */
export const checkTypePartListValidation = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): ReadonlyMap<d.TypePartId, TypePartData> => {
  const typeNameSet = new Set<string>();
  const typePartIdSet = new Set<d.TypePartId>();
  const typePartIdTypeParameterSizeMap = new Map<d.TypePartId, number>();
  const allTypePartIdTypePartNameMap = new Map<d.TypePartId, TypePartData>();
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

    allTypePartIdTypePartNameMap.set(typePartId, { tag: "typePart", typePart });

    const typeParameterNameSet: Set<string> = new Set();
    for (const typeParameter of typePart.dataTypeParameterList) {
      if (typePartIdSet.has(typeParameter.typePartId)) {
        throw new Error(
          "duplicate type part id. (type parameter) typePartId = " +
            (typeParameter.typePartId as string)
        );
      }
      typePartIdSet.add(typeParameter.typePartId);
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

      allTypePartIdTypePartNameMap.set(typeParameter.typePartId, {
        tag: "dataTypeParameter",
        name: typeParameter.name,
      });
    }
    typePartIdTypeParameterSizeMap.set(
      typePartId,
      typePart.dataTypeParameterList.length
    );
  }

  for (const typePart of typePartMap.values()) {
    checkTypePartBodyValidation(
      typePart.body,
      typePartIdTypeParameterSizeMap,
      new Set(
        typePart.dataTypeParameterList.map((parameter) => parameter.typePartId)
      ),
      typePart.name
    );
  }
  return allTypePartIdTypePartNameMap;
};

const checkTypePartBodyValidation = (
  typePartBody: d.TypePartBody,
  typeIdTypeParameterSizeMap: ReadonlyMap<d.TypePartId, number>,
  typeParameterTypePartIdSet: ReadonlySet<d.TypePartId>,
  typePartName: string
): void => {
  switch (typePartBody._) {
    case "Product":
      checkProductTypeValidation(
        typePartBody.memberList,
        typeIdTypeParameterSizeMap,
        typeParameterTypePartIdSet,
        typePartName
      );
      return;
    case "Sum":
      checkSumTypeValidation(
        typePartBody.patternList,
        typeIdTypeParameterSizeMap,
        typeParameterTypePartIdSet,
        typePartName
      );
  }
};

const checkProductTypeValidation = (
  memberList: ReadonlyArray<d.Member>,
  typeIdTypeParameterSizeMap: ReadonlyMap<d.TypePartId, number>,
  typeParameterTypePartIdSet: ReadonlySet<d.TypePartId>,
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
    checkTypeValidation(
      member.type,
      typeIdTypeParameterSizeMap,
      typeParameterTypePartIdSet
    );
  }
};

const checkSumTypeValidation = (
  patternList: ReadonlyArray<d.Pattern>,
  typeIdTypeParameterSizeMap: ReadonlyMap<d.TypePartId, number>,
  typeParameterTypePartIdSet: ReadonlySet<d.TypePartId>,
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
        typeIdTypeParameterSizeMap,
        typeParameterTypePartIdSet
      );
    }
  }
};

const checkTypeValidation = (
  type: d.Type,
  typeIdTypeParameterSizeMap: ReadonlyMap<d.TypePartId, number>,
  typeParameterTypePartIdSet: ReadonlySet<d.TypePartId>
): void => {
  const typeParameterSize = typeParamterCountFromTypePartId(
    type.output.typePartId,
    typeIdTypeParameterSizeMap,
    typeParameterTypePartIdSet
  );
  if (typeParameterSize !== type.output.arguments.length) {
    throw new Error(
      "type parameter size not match. type part need " +
        typeParameterSize.toString() +
        ". but use " +
        type.output.arguments.length.toString() +
        "parameter(s)"
    );
  }
};

const typeParamterCountFromTypePartId = (
  typePartId: d.TypePartId,
  typeIdTypeParameterSizeMap: ReadonlyMap<d.TypePartId, number>,
  typeParameterTypePartIdSet: ReadonlySet<d.TypePartId>
) => {
  const typeParameterSize = typeIdTypeParameterSizeMap.get(typePartId);
  if (typeParameterSize !== undefined) {
    return typeParameterSize;
  }
  const existTypeParamter = typeParameterTypePartIdSet.has(typePartId);
  if (existTypeParamter) {
    return 0;
  }
  throw new Error(
    "typePart (typePartId =" + (typePartId as string) + ") is not found"
  );
};
