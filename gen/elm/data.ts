import * as data from "../../data";

const reservedWord = new Set([
  "if",
  "then",
  "else",
  "case",
  "of",
  "let",
  "in",
  "type",
  "module",
  "where",
  "import",
  "port",
  "exposing",
  "as",
  "alias",
]);

const indent = "    ";

export const fieldNameFromString = (
  fieldName: string
): data.Maybe<data.ElmFieldName> => {
  if (/^[a-z][a-zA-Z0-9_]*/u.test(fieldName) && !reservedWord.has(fieldName)) {
    return data.Maybe.Just(data.ElmFieldName.FieldName(fieldName));
  }
  return data.Maybe.Nothing();
};

export const fieldNameFromStringOrThrow = (
  fieldName: string
): data.ElmFieldName => {
  const result = fieldNameFromString(fieldName);
  switch (result._) {
    case "Just":
      return result.value;
    case "Nothing":
      throw new Error("invalid field name = " + fieldName);
  }
};

export const variantNameFormString = (
  variantName: string
): data.Maybe<data.ElmVariantName> => {
  if (
    /^[A-Z][a-zA-Z0-9_]*/u.test(variantName) &&
    !reservedWord.has(variantName)
  ) {
    return data.Maybe.Just(data.ElmVariantName.VariantName(variantName));
  }
  return data.Maybe.Nothing();
};

/**
 * @throws バリアント名にできない名前だった場合
 */
export const variantNameFormStringOrThrow = (
  variantName: string
): data.ElmVariantName => {
  const result = variantNameFormString(variantName);
  switch (result._) {
    case "Just":
      return result.value;
    case "Nothing":
      throw new Error("invalid variant name = " + variantName);
  }
};

export const elmTypeNameFromString = (
  typeName: string
): data.Maybe<data.ElmTypeName> => {
  if (/^[A-Z][a-zA-Z0-9_]*$/u.test(typeName) && !reservedWord.has(typeName)) {
    return data.Maybe.Just(data.ElmTypeName.ElmTypeName(typeName));
  }
  return data.Maybe.Nothing();
};

/**
 * @throws 型名にできない名前だった場合
 */
export const elmTypeNameFromStringOrThrow = (
  typeName: string
): data.ElmTypeName => {
  const result = elmTypeNameFromString(typeName);
  switch (result._) {
    case "Just":
      return result.value;
    case "Nothing":
      throw new Error("invalid elm type name = " + typeName);
  }
};

export const codeToString = (elmCode: data.ElmCode): string => {
  checkDuplicateTypeDeclamationName(elmCode);

  return (
    "module " +
    elmCode.moduleName +
    " exposing (" +
    elmCode.typeDeclarationList.map(typeDeclarationToExportName).join(", ") +
    ")" +
    "\n\n" +
    codeToImportSection(elmCode) +
    "\n\n" +
    elmCode.typeDeclarationList.map(typeDeclarationToString).join("\n\n") +
    "\n"
  );
};

const checkDuplicateTypeDeclamationName = (elmCode: data.ElmCode): void => {
  const nameSet = new Set<string>();
  for (const typeDeclaration of elmCode.typeDeclarationList) {
    const nameAsString = getTypeDeclarationName(typeDeclaration).string;
    if (nameSet.has(nameAsString)) {
      throw new Error(
        "duplicate type declaration name. name = " + nameAsString
      );
    }
    nameSet.add(nameAsString);
  }
};

const getTypeDeclarationName = (
  typeDeclaration: data.ElmTypeDeclaration
): data.ElmTypeName => {
  switch (typeDeclaration._) {
    case "CustomType":
      return typeDeclaration.elmCustomType.name;
    case "TypeAlias":
      return typeDeclaration.elmTypeAlias.name;
  }
};

const typeDeclarationToExportName = (
  typeDeclaration: data.ElmTypeDeclaration
): string => {
  switch (typeDeclaration._) {
    case "CustomType":
      return customTypeToExportName(typeDeclaration.elmCustomType);
    case "TypeAlias":
      if (typeDeclaration.elmTypeAlias.export) {
        return typeDeclaration.elmTypeAlias.name.string;
      }
      return "";
  }
};

const codeToImportSection = (code: data.ElmCode): string =>
  [...collectModuleName(code)]
    .map((moduleName): string => "import " + moduleName)
    .join("\n");

const customTypeToExportName = (customType: data.ElmCustomType): string => {
  switch (customType.export) {
    case "NoExport":
      return "";
    case "ExportTypeOnly":
      return customType.name.string;
    case "ExportTypeAndVariant":
      return customType.name.string + "(..)";
  }
};

const typeDeclarationToString = (
  typeDeclaration: data.ElmTypeDeclaration
): string => {
  switch (typeDeclaration._) {
    case "TypeAlias":
      return typeAliasToString(typeDeclaration.elmTypeAlias);
    case "CustomType":
      return customTypeToString(typeDeclaration.elmCustomType);
  }
};

const typeAliasToString = (typeAlias: data.ElmTypeAlias): string =>
  commentToString(typeAlias.comment) +
  "type alias " +
  typeAlias.name.string +
  (typeAlias.parameter.length === 0
    ? ""
    : " " + typeAlias.parameter.join(" ")) +
  " =\n" +
  indent +
  elmTypeToString(typeAlias.type);

const commentToString = (comment: string): string => {
  if (comment.length === 0) {
    return "";
  }
  return "{-| " + comment + "\n-}\n";
};

const fieldToString = (field: data.ElmField): string =>
  field.name.string + " : " + elmTypeToString(field.type);

const customTypeToString = (customType: data.ElmCustomType): string =>
  commentToString(customType.comment) +
  "type " +
  customType.name.string +
  (customType.parameter.length === 0
    ? ""
    : " " + customType.parameter.join(" ")) +
  "\n" +
  indent +
  "= " +
  customType.variantList.map(variantToString).join("\n" + indent + "| ");

const variantToString = (variant: data.ElmVariant): string =>
  variant.name.string +
  (variant.parameter.length === 0
    ? ""
    : " " + variant.parameter.map(elmTypeToString).join(" "));

const elmTypeToString = (elmType: data.ElmType): string => {
  switch (elmType._) {
    case "LocalType":
      if (elmType.elmLocalType.parameter.length === 0) {
        return elmType.elmLocalType.typeName.string;
      }
      return (
        "(" +
        elmType.elmLocalType.typeName.string +
        " " +
        elmType.elmLocalType.parameter.map(elmTypeToString).join(" ") +
        ")"
      );
    case "ImportedType":
      if (elmType.elmImportedType.parameter.length === 0) {
        return (
          elmType.elmImportedType.moduleName +
          "." +
          elmType.elmImportedType.typeName.string
        );
      }
      return (
        "(" +
        elmType.elmImportedType.moduleName +
        "." +
        elmType.elmImportedType.typeName.string +
        " " +
        elmType.elmImportedType.parameter.map(elmTypeToString).join(" ") +
        ")"
      );
    case "TypeParameter":
      return elmType.string;
    case "Function":
      return (
        "(" +
        elmTypeToString(elmType.elmFunctionType.input) +
        " -> " +
        elmTypeToString(elmType.elmFunctionType.output) +
        ")"
      );
    case "List":
      return "(List " + elmTypeToString(elmType.elmType) + ")";
    case "Tuple0":
      return "()";
    case "Tuple2":
      return (
        "(" +
        elmTypeToString(elmType.elmTuple2.first) +
        ", " +
        elmTypeToString(elmType.elmTuple2.second) +
        ")"
      );
    case "Tuple3":
      return (
        "(" +
        elmTypeToString(elmType.elmTuple3.first) +
        ", " +
        elmTypeToString(elmType.elmTuple3.second) +
        ", " +
        elmTypeToString(elmType.elmTuple3.third) +
        ")"
      );
    case "Record":
      return (
        "{ " +
        elmType.elmFieldList.map((e): string => fieldToString(e)).join(", ") +
        " }"
      );
  }
};

const collectModuleName = (code: data.ElmCode): ReadonlySet<string> =>
  new Set(
    code.typeDeclarationList.flatMap(
      (typeDeclaration): ReadonlyArray<string> => {
        switch (typeDeclaration._) {
          case "CustomType":
            return [
              ...collectModuleNameInCustomType(typeDeclaration.elmCustomType),
            ];
          case "TypeAlias":
            return [
              ...collectModuleNameInType(typeDeclaration.elmTypeAlias.type),
            ];
        }
      }
    )
  );

const collectModuleNameInCustomType = (
  customType: data.ElmCustomType
): ReadonlySet<string> =>
  new Set(
    customType.variantList.flatMap((variant) =>
      variant.parameter.flatMap((parameter) => [
        ...collectModuleNameInType(parameter),
      ])
    )
  );

const collectModuleNameInType = (
  elmType: data.ElmType
): ReadonlySet<string> => {
  switch (elmType._) {
    case "Function":
      return new Set([
        ...collectModuleNameInType(elmType.elmFunctionType.input),
        ...collectModuleNameInType(elmType.elmFunctionType.output),
      ]);
    case "ImportedType":
      return new Set([elmType.elmImportedType.moduleName]);
    case "TypeParameter":
      return new Set();
    case "LocalType":
      return new Set();
    case "Record":
      return new Set(
        elmType.elmFieldList.flatMap((field) => [
          ...collectModuleNameInType(field.type),
        ])
      );
    case "List":
      return new Set();
    case "Tuple0":
      return new Set();
    case "Tuple2":
      return new Set([
        ...collectModuleNameInType(elmType.elmTuple2.first),
        ...collectModuleNameInType(elmType.elmTuple2.second),
      ]);
    case "Tuple3":
      return new Set([
        ...collectModuleNameInType(elmType.elmTuple3.first),
        ...collectModuleNameInType(elmType.elmTuple3.second),
        ...collectModuleNameInType(elmType.elmTuple3.third),
      ]);
  }
};
