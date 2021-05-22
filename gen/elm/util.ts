import * as data from "../../data";
import * as elmData from "./data";

const importedType = (
  moduleName: string,
  typeName: string,
  parameter: ReadonlyArray<data.ElmType>
): data.ElmType =>
  data.ElmType.ImportedType({
    moduleName,
    typeName: elmData.elmTypeNameFromStringOrThrow(typeName),
    parameter,
  });

/** https://package.elm-lang.org/packages/elm/core/latest/Array#Array */
export const Array = (elementType: data.ElmType): data.ElmType =>
  importedType("Array", "Array", [elementType]);

/**
 * 基本の整数型 JSの出力なら -9007199254740991 ~ 9007199254740991 の範囲に対応している
 * https://package.elm-lang.org/packages/elm/core/latest/Basics#Int
 */
export const Int = importedType("Basics", "Int", []);

/**
 * https://package.elm-lang.org/packages/elm/core/latest/Basics#Float
 */
export const Float = importedType("Basics", "Float", []);

/**
 * https://package.elm-lang.org/packages/elm/core/latest/Basics#Order
 */
export const Order = importedType("Basics", "Order", []);

/**
 * https://package.elm-lang.org/packages/elm/core/latest/Basics#Bool
 */
export const Bool = importedType("Basics", "Bool", []);

/**
 * https://package.elm-lang.org/packages/elm/core/latest/Basics#Never
 */
export const Never = importedType("Basics", "Never", []);

/**
 * https://package.elm-lang.org/packages/elm/core/latest/String#String
 */
export const String = importedType("String", "String", []);

/**
 * https://package.elm-lang.org/packages/elm/core/latest/Char#Char
 */
export const Char = importedType("Char", "Char", []);

/** https://package.elm-lang.org/packages/elm/core/latest/Maybe#Maybe */
export const Maybe = (a: data.ElmType): data.ElmType =>
  importedType("Maybe", "Maybe", [a]);

/** https://package.elm-lang.org/packages/elm/core/latest/Result#Result */
export const Result = (
  error: data.ElmType,
  value: data.ElmType
): data.ElmType => importedType("Result", "Result", [error, value]);

/** https://package.elm-lang.org/packages/elm/core/latest/Platform-Cmd#Cmd */
export const Cmd = (msg: data.ElmType): data.ElmType =>
  importedType("Platform.Cmd", "Cmd", [msg]);

/** https://package.elm-lang.org/packages/elm/core/latest/Platform-Sub#Sub */
export const Sub = (msg: data.ElmType): data.ElmType =>
  importedType("Platform.Sub", "Sub", [msg]);

/** https://package.elm-lang.org/packages/elm/core/latest/Set#Set */
export const Set = (a: data.ElmType): data.ElmType =>
  importedType("Set", "Set", [a]);

/** https://package.elm-lang.org/packages/elm/core/latest/Platform#Task */
export const Task = (x: data.ElmType, a: data.ElmType): data.ElmType =>
  importedType("Platform", "Task", [a]);

/** https://package.elm-lang.org/packages/elm/bytes/latest/Bytes#Bytes */
export const Bytes: data.ElmType = importedType("Bytes", "Bytes", []);

/** https://package.elm-lang.org/packages/elm/bytes/latest/Bytes-Decode#Decoder */
export const BytesDecoder = (a: data.ElmType): data.ElmType =>
  importedType("Bytes.Decode", "Decoder", [a]);

/** https://package.elm-lang.org/packages/elm/bytes/latest/Bytes-Encode#Encoder */
export const BytesEncoder = (a: data.ElmType): data.ElmType =>
  importedType("Bytes.Encode", "Encoder", [a]);

/** https://package.elm-lang.org/packages/elm/json/latest/Json-Encode#Value */
export const JsonValue: data.ElmType = importedType("Json.Encode", "Value", []);

/** https://package.elm-lang.org/packages/elm/json/latest/Json-Decode#Decoder */
export const JsonDecoder = (a: data.ElmType): data.ElmType =>
  importedType("Json.Decode", "Decoder", [a]);

/** https://package.elm-lang.org/packages/elm/virtual-dom/latest/VirtualDom#Node */
export const VirtualDomNode = (msg: data.ElmType): data.ElmType =>
  importedType("VirtualDom", "Node", [msg]);

/** https://package.elm-lang.org/packages/elm/virtual-dom/latest/VirtualDom#Attribute */
export const VirtualDomAttribute = (msg: data.ElmType): data.ElmType =>
  importedType("VirtualDom", "Attribute", [msg]);
