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
import { Context } from "./context.ts";
import { exprToString } from "./expr.ts";

/**
 * 型の式をコードに変換する
 * @param type_ 型の式
 */
export const typeToString = (
  type_: d.TsType,
  context: Context,
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
      return typeObjectToString(type_.tsMemberTypeList, context);

    case "Function":
      return functionTypeToString(type_.functionType, context);

    case "Union":
      return type_.tsTypeList
        .map((pattern) => typeToString(pattern, context))
        .join(" | ");

    case "Intersection":
      return (
        typeToString(type_.intersectionType.left, context) +
        " & " +
        typeToString(type_.intersectionType.right, context)
      );

    case "ScopeInFile":
      return (
        type_.typeNameAndTypeParameter.name +
        typeArgumentsListToString(
          type_.typeNameAndTypeParameter.arguments,
          context,
        )
      );

    case "ScopeInGlobal": {
      if (context.usedNameSet.has(type_.typeNameAndTypeParameter.name)) {
        return (
          "globalThis." +
          type_.typeNameAndTypeParameter.name +
          typeArgumentsListToString(
            type_.typeNameAndTypeParameter.arguments,
            context,
          )
        );
      }
      return (
        type_.typeNameAndTypeParameter.name +
        typeArgumentsListToString(
          type_.typeNameAndTypeParameter.arguments,
          context,
        )
      );
    }

    case "WithNamespace":
      return (
        type_.namespace.join(".") +
        "." +
        type_.typeNameAndTypeParameter.name +
        typeArgumentsListToString(
          type_.typeNameAndTypeParameter.arguments,
          context,
        )
      );

    case "ImportedType": {
      const nameSpaceIdentifier = context.moduleMap.get(
        type_.importedType.moduleName,
      );
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
          context,
        )
      );
    }

    case "StringLiteral":
      return stringLiteralValueToString(type_.string);

    case "typeof":
      return "typeof " + exprToString(type_.expr, 0, context);
  }
};

const typeArgumentsListToString = (
  typeArguments: ReadonlyArray<d.TsType>,
  context: Context,
): string => {
  return typeArguments.length === 0 ? "" : "<" +
    typeArguments
      .map((argument) => typeToString(argument, context))
      .join(", ") +
    ">";
};

const typeObjectToString = (
  memberList: ReadonlyArray<d.TsMemberType>,
  context: Context,
): string =>
  "{ " +
  memberList
    .map(
      (member) =>
        documentToString(member.document) +
        "readonly " +
        propertyNameToString(member.name, context) +
        (member.required ? "" : "?") +
        ": " +
        typeToString(member.type, context),
    )
    .join("; ") +
  " }";

const propertyNameToString = (
  propertyName: d.PropertyName,
  context: Context,
): string => {
  switch (propertyName.type) {
    case "symbolExpr":
      return "[" +
        exprToString(propertyName.value, 0, context) + "]";
    case "string": {
      if (isSafePropertyName(propertyName.value)) {
        return propertyName.value;
      }
      return stringLiteralValueToString(propertyName.value);
    }
  }
};

/** 関数の引数と戻り値の型を文字列にする */
const functionTypeToString = (
  functionType: d.FunctionType,
  context: Context,
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
          parameter.name + ": " + typeToString(parameter.type, context),
      )
      .join(", ") +
    ") => " +
    typeToString(functionType.return, context)
  );
};

/**
 * codeTypeがTypeScriptだった場合,`: string`のような型注釈をつける
 */
export const typeAnnotation = (
  type_: d.TsType,
  context: Context,
): string => {
  switch (context.codeType) {
    case "JavaScript":
      return "";
    case "TypeScript":
      return ": " + typeToString(type_, context);
  }
};
