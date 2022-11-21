import * as d from "../data.ts";
import {
  createIdentifier,
  initialIdentifierIndex,
  isSafePropertyName,
  TsIdentifier,
} from "../identifier.ts";
import {
  documentToString,
  stringLiteralValueToString,
  typeParameterListToString,
} from "./common.ts";
import { exprToString } from "./expr.ts";

/**
 * 型の式をコードに変換する
 * @param type_ 型の式
 */
export const typeToString = (
  type_: d.TsType,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
): string => {
  switch (type_._) {
    case "Number":
      return "number";

    case "String":
      return "string";

    case "Boolean":
      return "boolean";

    case "Null":
      return "null";

    case "Never":
      return "never";

    case "Void":
      return "void";

    case "Undefined":
      return "undefined";

    case "unknown":
      return "unknown";

    case "Object":
      return typeObjectToString(type_.tsMemberTypeList, moduleMap);

    case "Function":
      return functionTypeToString(type_.functionType, moduleMap);

    case "Union":
      return type_.tsTypeList
        .map((pattern) => typeToString(pattern, moduleMap))
        .join(" | ");

    case "Intersection":
      return (
        typeToString(type_.intersectionType.left, moduleMap) +
        " & " +
        typeToString(type_.intersectionType.right, moduleMap)
      );

    case "ScopeInFile":
      return (
        type_.typeNameAndTypeParameter.name +
        typeArgumentsListToString(
          type_.typeNameAndTypeParameter.arguments,
          moduleMap,
        )
      );

    case "ScopeInGlobal":
      return (
        "globalThis." +
        type_.typeNameAndTypeParameter.name +
        typeArgumentsListToString(
          type_.typeNameAndTypeParameter.arguments,
          moduleMap,
        )
      );

    case "WithNamespace":
      return (
        type_.namespace.join(".") +
        "." +
        type_.typeNameAndTypeParameter.name +
        typeArgumentsListToString(
          type_.typeNameAndTypeParameter.arguments,
          moduleMap,
        )
      );

    case "ImportedType": {
      const nameSpaceIdentifier = moduleMap.get(type_.importedType.moduleName);
      if (nameSpaceIdentifier === undefined) {
        throw Error(
          "収集されなかった, モジュールがある moduleName=" +
            type_.importedType.moduleName,
        );
      }

      return (
        nameSpaceIdentifier +
        "." +
        type_.importedType.nameAndArguments.name +
        typeArgumentsListToString(
          type_.importedType.nameAndArguments.arguments,
          moduleMap,
        )
      );
    }

    case "StringLiteral":
      return stringLiteralValueToString(type_.string);

    case "typeof":
      return "typeof " + exprToString(type_.expr, 0, moduleMap, "TypeScript");
  }
};

const typeArgumentsListToString = (
  typeArguments: ReadonlyArray<d.TsType>,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
): string => {
  return typeArguments.length === 0 ? "" : "<" +
    typeArguments
      .map((argument) => typeToString(argument, moduleMap))
      .join(", ") +
    ">";
};

const typeObjectToString = (
  memberList: ReadonlyArray<d.TsMemberType>,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
): string =>
  "{ " +
  memberList
    .map(
      (member) =>
        documentToString(member.document) +
        "readonly " +
        (isSafePropertyName(member.name)
          ? member.name
          : stringLiteralValueToString(member.name)) +
        (member.required ? "" : "?") +
        ": " +
        typeToString(member.type, moduleMap),
    )
    .join("; ") +
  " }";

/** 関数の引数と戻り値の型を文字列にする */
const functionTypeToString = (
  functionType: d.FunctionType,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
): string => {
  let index = initialIdentifierIndex;
  const parameterList: Array<{
    name: TsIdentifier;
    type: d.TsType;
  }> = [];
  for (const parameter of functionType.parameterList) {
    const indexAndIdentifier = createIdentifier(index, new Set());
    index = indexAndIdentifier.nextIdentifierIndex;
    parameterList.push({
      name: indexAndIdentifier.identifier,
      type: parameter,
    });
  }

  return (
    typeParameterListToString(functionType.typeParameterList) +
    "(" +
    parameterList
      .map(
        (parameter) =>
          parameter.name + ": " + typeToString(parameter.type, moduleMap),
      )
      .join(", ") +
    ") => " +
    typeToString(functionType.return, moduleMap)
  );
};

/**
 * codeTypeがTypeScriptだった場合,`: string`のような型注釈をつける
 */
export const typeAnnotation = (
  type_: d.TsType,
  codeType: d.CodeType,
  moduleMap: ReadonlyMap<string, TsIdentifier>,
): string => {
  switch (codeType) {
    case "JavaScript":
      return "";
    case "TypeScript":
      return ": " + typeToString(type_, moduleMap);
  }
};
