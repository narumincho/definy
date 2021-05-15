import * as d from "../data";
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
  allTypePartIdTypePartNameMap: ReadonlyMap<d.TypePartId, string>
): d.TsType => {
  const typePartName = allTypePartIdTypePartNameMap.get(type.typePartId);
  if (typePartName === undefined) {
    throw new Error(
      "internal error not found type part name in typeToTsType. typePartId =" +
        (type.typePartId as string)
    );
  }
  return d.TsType.WithTypeParameter({
    type: d.TsType.ScopeInFile(jsTs.identiferFromString(typePartName)),
    typeParameterList: type.parameter.map((parameter) =>
      typeToTsType(parameter, allTypePartIdTypePartNameMap)
    ),
  });
};

export const typeToMemberOrParameterName = (
  type: d.Type,
  allTypePartIdTypePartNameMap: ReadonlyMap<d.TypePartId, string>
): string => {
  return firstLowerCase(toTypeName(type, allTypePartIdTypePartNameMap));
};

export const codecPropertyName = "codec";
export const encodePropertyName = "encode";
export const decodePropertyName = "decode";
export const helperName = "helper";
export const resultProperty = "result";
export const nextIndexProperty = "nextIndex";

export const typePartIdPropertyName = "typePartId";
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
  allTypePartIdTypePartNameMap: ReadonlyMap<d.TypePartId, string>
): string => {
  const typePartName = allTypePartIdTypePartNameMap.get(type.typePartId);
  if (typePartName === undefined) {
    throw new Error(
      "internal error not found type part name in toTypeName. typePartId =" +
        (type.typePartId as string)
    );
  }
  return (
    type.parameter
      .map((parameter) => toTypeName(parameter, allTypePartIdTypePartNameMap))
      .join("") + typePartName
  );
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

export const definyCodeProjectId =
  "1e4531eba1d93cd9f9f31a8bc49551a2" as d.ProjectId;

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

/** 型パーツIDから型パラメーターをしていしない型を指定する */
export const noParameterType = (typePartId: d.TypePartId): d.Type => ({
  typePartId,
  parameter: [],
});
