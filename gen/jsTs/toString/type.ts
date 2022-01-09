import * as d from "../../../localData";
import {
  createIdentifier,
  initialIdentifierIndex,
  isSafePropertyName,
} from "../identifier";
import {
  documentToString,
  stringLiteralValueToString,
  typeParameterListToString,
} from "./common";

/**
 * 型の式をコードに変換する
 * @param type_ 型の式
 */
export const typeToString = (
  type_: d.TsType,
  moduleMap: ReadonlyMap<string, d.TsIdentifier>
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

    case "WithTypeParameter":
      return (
        typeToString(type_.tsTypeWithTypeParameter.type, moduleMap) +
        (type_.tsTypeWithTypeParameter.typeParameterList.length === 0
          ? ""
          : "<" +
            type_.tsTypeWithTypeParameter.typeParameterList
              .map((typeParameter) => typeToString(typeParameter, moduleMap))
              .join(", ") +
            ">")
      );

    case "ScopeInFile":
      return type_.tsIdentifier.string;

    case "ScopeInGlobal":
      return type_.tsIdentifier.string;

    case "ImportedType": {
      const nameSpaceIdentifier = moduleMap.get(type_.importedType.moduleName);
      if (nameSpaceIdentifier === undefined) {
        throw Error(
          "収集されなかった, モジュールがある moduleName=" +
            type_.importedType.moduleName
        );
      }

      return nameSpaceIdentifier.string + "." + type_.importedType.name.string;
    }

    case "StringLiteral":
      return stringLiteralValueToString(type_.string);
  }
};

const typeObjectToString = (
  memberList: ReadonlyArray<d.TsMemberType>,
  moduleMap: ReadonlyMap<string, d.TsIdentifier>
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
        typeToString(member.type, moduleMap)
    )
    .join("; ") +
  " }";

/** 関数の引数と戻り値の型を文字列にする */
const functionTypeToString = (
  functionType: d.FunctionType,
  moduleMap: ReadonlyMap<string, d.TsIdentifier>
): string => {
  let index = initialIdentifierIndex;
  const parameterList: Array<{
    name: d.TsIdentifier;
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
          parameter.name.string + ": " + typeToString(parameter.type, moduleMap)
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
  moduleMap: ReadonlyMap<string, d.TsIdentifier>
): string => {
  switch (codeType) {
    case "JavaScript":
      return "";
    case "TypeScript":
      return ": " + typeToString(type_, moduleMap);
  }
};
