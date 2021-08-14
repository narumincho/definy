import * as d from "../localData";
import { jsTs } from "../gen/main";

const millisecondInDay = 1000 * 60 * 60 * 24;

export const timeToDate = (dateTime: d.Time): Date =>
  new Date(dateTime.day * millisecondInDay + dateTime.millisecond);

export const timeFromDate = (date: Date): d.Time => {
  const millisecond = date.getTime();
  return {
    day: Math.floor(millisecond / millisecondInDay),
    millisecond: millisecond % millisecondInDay,
  };
};

export const typeToTsType = (
  type: d.Type,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): d.TsType => {
  return dataTypeOrDataTypeParameterToTsType(
    type.output,
    typePartMap,
    scopeTypePartDataTypeParameterList
  );
};

const dataTypeOrDataTypeParameterToTsType = (
  dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): d.TsType => {
  switch (dataTypeOrDataTypeParameter._) {
    case "DataType": {
      const typePart = typePartMap.get(
        dataTypeOrDataTypeParameter.dataType.typePartId
      );
      if (typePart === undefined) {
        throw new Error(
          "internal error not found type part name in typeToTsType. typePartId =" +
            dataTypeOrDataTypeParameter.dataType.typePartId
        );
      }
      return d.TsType.WithTypeParameter({
        type: d.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
        typeParameterList: dataTypeOrDataTypeParameter.dataType.arguments.map(
          (parameter) =>
            dataTypeOrDataTypeParameterToTsType(
              parameter,
              typePartMap,
              scopeTypePartDataTypeParameterList
            )
        ),
      });
    }
    case "DataTypeParameter": {
      const dataTypeParameter =
        scopeTypePartDataTypeParameterList[dataTypeOrDataTypeParameter.int32];
      if (dataTypeParameter === undefined) {
        throw new Error(
          `data type parameter index error. hint = ${scopeTypePartDataTypeParameterList}`
        );
      }

      return d.TsType.ScopeInFile(
        jsTs.identiferFromString(dataTypeParameter.name)
      );
    }
  }
};

export const typeToMemberOrParameterName = (
  type: d.Type,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): string => {
  return firstLowerCase(
    toTypeName(type, typePartMap, scopeTypePartDataTypeParameterList)
  );
};

export const codecPropertyName = "codec";
export const encodePropertyName = "encode";
export const decodePropertyName = "decode";
export const helperName = "helper";
export const resultProperty = "result";
export const nextIndexProperty = "nextIndex";

export const typePartIdPropertyName = "typePartId";
export const fromStringPropertyName = "fromString";

/**
 * エンコードの関数を呼ぶ
 * ```ts
 * codec.encode(value)
 * ```
 */
export const callEncode = (codecExpr: d.TsExpr, value: d.TsExpr): d.TsExpr =>
  jsTs.callMethod(codecExpr, encodePropertyName, [value]);

/**
 * デコードの関数を呼ぶ
 * ```ts
 * codec.decode(index, binary)
 * ```
 */
export const callDecode = (
  codecExpr: d.TsExpr,
  index: d.TsExpr,
  binary: d.TsExpr
): d.TsExpr => jsTs.callMethod(codecExpr, decodePropertyName, [index, binary]);

export const toTypeName = (
  type: d.Type,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): string => {
  return dataTypeOrDataTypeParameterToTypeName(
    type.output,
    typePartMap,
    scopeTypePartDataTypeParameterList
  );
};

export const dataTypeOrDataTypeParameterToTypeName = (
  dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): string => {
  switch (dataTypeOrDataTypeParameter._) {
    case "DataType": {
      const typePart = typePartMap.get(
        dataTypeOrDataTypeParameter.dataType.typePartId
      );
      if (typePart === undefined) {
        throw new Error(
          "internal error not found type part name in toTypeName. typePartId =" +
            dataTypeOrDataTypeParameter.dataType.typePartId
        );
      }
      return (
        dataTypeOrDataTypeParameter.dataType.arguments
          .map((parameter) =>
            dataTypeOrDataTypeParameterToTypeName(
              parameter,
              typePartMap,
              scopeTypePartDataTypeParameterList
            )
          )
          .join("") + typePart.name
      );
    }
    case "DataTypeParameter": {
      const dataTypeParameter =
        scopeTypePartDataTypeParameterList[dataTypeOrDataTypeParameter.int32];
      if (dataTypeParameter === undefined) {
        throw new Error(
          `data type parameter index error. hint = ${scopeTypePartDataTypeParameterList}`
        );
      }
      return dataTypeParameter.name;
    }
  }
};

export const isTagTypeAllNoParameter = (
  patternList: ReadonlyArray<d.Pattern>
): boolean =>
  patternList.every(
    (tagNameAndParameter) => tagNameAndParameter.parameter._ === "Nothing"
  );

export const firstUpperCase = (text: string): string =>
  text.substring(0, 1).toUpperCase() + text.substring(1);

export const firstLowerCase = (text: string): string =>
  text.substring(0, 1).toLowerCase() + text.substring(1);

export const isFirstUpperCaseName = (text: string): boolean => {
  const [firstChar] = text;
  if (firstChar === undefined) {
    return false;
  }
  if (!"ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(firstChar)) {
    return false;
  }
  for (const char of text.slice(1)) {
    if (
      !"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".includes(
        char
      )
    ) {
      return false;
    }
  }
  return true;
};

export const isFirstLowerCaseName = (text: string): boolean => {
  const [firstChar] = text;
  if (firstChar === undefined) {
    return false;
  }
  if (!"abcdefghijklmnopqrstuvwxyz".includes(firstChar)) {
    return false;
  }
  for (const char of text.slice(1)) {
    if (
      !"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".includes(
        char
      )
    ) {
      return false;
    }
  }
  return true;
};

export const definyCodeProjectId = d.ProjectId.fromString(
  "1e4531eba1d93cd9f9f31a8bc49551a2"
);

/** エディタ上で型の名前を作る. 先頭は小文字だがエディタ上は大文字 */
export const stringToTypePartName = (text: string): string | undefined => {
  const normalizedText = text.normalize("NFKC");
  let isBeforeSpace = false;
  let isFirstChar = true;
  let result = "";
  for (const char of normalizedText) {
    if (isFirstChar) {
      if (/^[a-zA-Z]$/u.test(char)) {
        result += char.toLowerCase();
        isFirstChar = false;
      }
    } else if (/^[a-zA-Z0-9]$/u.test(char)) {
      result += isBeforeSpace ? char.toUpperCase() : char;
      isBeforeSpace = false;
    } else {
      isBeforeSpace = true;
    }
  }
  return result.slice(0, 64);
};

/** サーバー上での型の名前のバリテーション */
export const isValidTypePartName = (text: string): boolean => {
  return /^[a-z][a-zA-Z0-9]*$/u.test(text) && text.length <= 64;
};
