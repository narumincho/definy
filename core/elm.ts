import * as d from "../localData";
import { TypePartData, checkTypePartListValidation } from "./validation";
import { elm } from "../gen/main";

export const generateElmCodeAsString = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): string => {
  return elm.codeToString(generateElmCode(typePartMap));
};

export const generateElmCode = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.ElmCode => {
  const allTypePartIdTypePartNameMap = checkTypePartListValidation(typePartMap);
  return {
    moduleName: "Data",
    typeDeclarationList: undefinedFlatMap(
      [...typePartMap.values()],
      (typePart) =>
        typePartToElmTypeDeclaration(typePart, allTypePartIdTypePartNameMap)
    ),
  };
};

const undefinedFlatMap = <Input, Output>(
  array: ReadonlyArray<Input>,
  func: (element: Input) => Output | undefined
) => {
  const out: Array<Output> = [];
  for (const element of array) {
    const outputElement = func(element);
    if (outputElement !== undefined) {
      out.push(outputElement);
    }
  }
  return out;
};

const typePartToElmTypeDeclaration = (
  typePart: d.TypePart,
  typePartDataMap: ReadonlyMap<d.TypePartId, TypePartData>
): d.ElmTypeDeclaration | undefined => {
  switch (typePart.body._) {
    case "Product":
      return d.ElmTypeDeclaration.TypeAlias({
        name: stringToElmTypeName(typePart.name),
        comment: typePart.description,
        export: true,
        parameter: typePart.dataTypeParameterList.map(
          (typeParameter) => typeParameter.name
        ),
        type: d.ElmType.Record(
          typePart.body.memberList.map(
            (member): d.ElmField => ({
              name: stringToElmFiledName(member.name),
              type: definyTypeToElmType(member.type, typePartDataMap),
            })
          )
        ),
      });
    case "Sum":
      return d.ElmTypeDeclaration.CustomType({
        name: stringToElmTypeName(typePart.name),
        comment: typePart.description,
        export: d.ElmCustomTypeExportLevel.ExportTypeAndVariant,
        parameter: typePart.dataTypeParameterList.map(
          (typeParameter) => typeParameter.name
        ),
        variantList: typePart.body.patternList.map(
          (pattern): d.ElmVariant => ({
            name: stringToVariantName(pattern.name),
            parameter:
              pattern.parameter._ === "Just"
                ? [
                    definyTypeToElmType(
                      pattern.parameter.value,
                      typePartDataMap
                    ),
                  ]
                : [],
          })
        ),
      });
    case "Kernel":
      return definyTypePartBodyKernelToElmType(
        typePart,
        typePart.body.typePartBodyKernel
      );
  }
};

const stringToElmTypeName = (name: string): d.ElmTypeName => {
  const typeName = elm.elmTypeNameFromString(name);
  switch (typeName._) {
    case "Just":
      return typeName.value;
    case "Nothing":
      return elm.elmTypeNameFromStringOrThrow(name + "_");
  }
};

const stringToElmFiledName = (name: string): d.ElmFieldName => {
  const filedName = elm.fieldNameFromString(name);
  switch (filedName._) {
    case "Just":
      return filedName.value;
    case "Nothing":
      return elm.fieldNameFromStringOrThrow(name + "_");
  }
};

const stringToVariantName = (name: string): d.ElmVariantName => {
  const variantName = elm.variantNameFormString(name);
  switch (variantName._) {
    case "Just":
      return variantName.value;
    case "Nothing":
      return elm.variantNameFormStringOrThrow(name + "_");
  }
};

const definyTypePartBodyKernelToElmType = (
  typePart: d.TypePart,
  typePartBodyKernel: d.TypePartBodyKernel
): d.ElmTypeDeclaration | undefined => {
  switch (typePartBodyKernel) {
    case "Int32":
    case "String":
    case "Binary":
      return;
    case "Id":
    case "Token":
      return d.ElmTypeDeclaration.CustomType({
        name: stringToElmTypeName(typePart.name),
        comment: typePart.description,
        export: d.ElmCustomTypeExportLevel.ExportTypeAndVariant,
        parameter: [],
        variantList: [
          {
            name: stringToVariantName(typePart.name),
            parameter: [elm.String],
          },
        ],
      });
    case "List":
  }
};

const definyTypeToElmType = (
  type: d.Type,
  typePartDataMap: ReadonlyMap<d.TypePartId, TypePartData>
): d.ElmType => {
  const typePart = typePartDataMap.get(type.typePartId);
  if (typePart === undefined) {
    throw new Error(
      "internal error: not found type part name in definyTypeToElmType. typePartId =" +
        (type.typePartId as string)
    );
  }
  if (typePart.tag === "dataTypeParameter") {
    return d.ElmType.TypeParameter(typePart.name);
  }

  return d.ElmType.LocalType({
    typeName: stringToElmTypeName(typePart.typePart.name),
    parameter: type.parameter.map((parameter) =>
      definyTypeToElmType(parameter, typePartDataMap)
    ),
  });
};
