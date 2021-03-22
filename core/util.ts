import * as d from "../data";
import { identifer, util as tsUtil } from "../gen/jsTs/main";

export const maybeMap = <Input, Output>(
  maybe: d.Maybe<Input>,
  func: (input: Input) => Output
): d.Maybe<Output> => {
  switch (maybe._) {
    case "Just":
      return d.Maybe.Just(func(maybe.value));
    case "Nothing":
      return d.Maybe.Nothing();
  }
};

export const maybeWithDefault = <T>(maybe: d.Maybe<T>, defaultValue: T): T => {
  switch (maybe._) {
    case "Just":
      return maybe.value;
    case "Nothing":
      return defaultValue;
  }
};

export const maybeUnwrap = <T, U>(
  maybe: d.Maybe<T>,
  func: (t: T) => U,
  defaultValue: U
): U => {
  switch (maybe._) {
    case "Just":
      return func(maybe.value);
    case "Nothing":
      return defaultValue;
  }
};

export const maybeAndThen = <T, U>(
  maybe: d.Maybe<T>,
  func: (t: T) => d.Maybe<U>
): d.Maybe<U> => {
  switch (maybe._) {
    case "Just":
      return func(maybe.value);
    case "Nothing":
      return d.Maybe.Nothing();
  }
};

export const resultMap = <InputOk, InputError, OutputOk, OutputError>(
  result: d.Result<InputOk, InputError>,
  okFunc: (input: InputOk) => OutputOk,
  errorFunc: (input: InputError) => OutputError
): d.Result<OutputOk, OutputError> => {
  switch (result._) {
    case "Ok":
      return d.Result.Ok(okFunc(result.ok));
    case "Error":
      return d.Result.Error(errorFunc(result.error));
  }
};

export const resultMapOk = <InputOk, OutputOk, Error>(
  result: d.Result<InputOk, Error>,
  func: (input: InputOk) => OutputOk
): d.Result<OutputOk, Error> => {
  switch (result._) {
    case "Ok":
      return d.Result.Ok(func(result.ok));
    case "Error":
      return result;
  }
};

export const resultMapError = <Ok, InputError, OutputError>(
  result: d.Result<Ok, InputError>,
  func: (input: InputError) => OutputError
): d.Result<Ok, OutputError> => {
  switch (result._) {
    case "Ok":
      return result;
    case "Error":
      return d.Result.Error(func(result.error));
  }
};

export const resultWithDefault = <Ok, Error>(
  result: d.Result<Ok, Error>,
  defaultValue: Ok
): Ok => {
  switch (result._) {
    case "Ok":
      return result.ok;
    case "Error":
      return defaultValue;
  }
};

export const resultToMaybe = <Ok, Error>(
  result: d.Result<Ok, Error>
): d.Maybe<Ok> => {
  switch (result._) {
    case "Ok":
      return d.Maybe.Just(result.ok);
    case "Error":
      return d.Maybe.Nothing();
  }
};

export const resultFromMaybe = <Ok, Error>(
  maybe: d.Maybe<Ok>,
  error: Error
): d.Result<Ok, Error> => {
  switch (maybe._) {
    case "Just":
      return d.Result.Ok(maybe.value);
    case "Nothing":
      return d.Result.Error(error);
  }
};

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
    type: d.TsType.ScopeInFile(identifer.fromString(typePartName)),
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
  tsUtil.callMethod(codecExpr, encodePropertyName, [value]);

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
): d.TsExpr =>
  tsUtil.callMethod(codecExpr, decodePropertyName, [index, binary]);

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

export const definyCodeProjectId = "1e4531eba1d93cd9f9f31a8bc49551a2" as d.ProjectId;

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
