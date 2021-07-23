import * as codec from "./kernelType/codec";
import * as d from "../localData";
import * as util from "./util";
import { TypePartData } from "./validation";
import { jsTs } from "../gen/main";

export const typePartMapToTypeAlias = (
  typePartDataMap: ReadonlyMap<d.TypePartId, TypePartData>
): ReadonlyArray<d.TypeAlias> => {
  return [
    codec.codecTypeAlias(),
    ...[...typePartDataMap.values()].flatMap((typePartData) =>
      typePartData.tag === "typePart"
        ? [typePartToTypeAlias(typePartData.typePart, typePartDataMap)]
        : []
    ),
  ];
};

export const typePartToTypeAlias = (
  typePart: d.TypePart,
  typePartDataMap: ReadonlyMap<d.TypePartId, TypePartData>
): d.TypeAlias => ({
  name: jsTs.identiferFromString(typePart.name),
  document: typePart.description + "\n@typePartId " + (typePart.id as string),
  typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
    jsTs.identiferFromString(typeParameter.name)
  ),
  type: typePartToTsType(typePart, typePartDataMap),
});

const typePartToTsType = (
  typePart: d.TypePart,
  typePartDataMap: ReadonlyMap<d.TypePartId, TypePartData>
): d.TsType => {
  if (typePart.attribute._ === "Just") {
    return typePartWithAttributeToTsType(
      typePart,
      typePart.attribute.value,
      typePartDataMap
    );
  }
  switch (typePart.body._) {
    case "Sum":
      if (util.isTagTypeAllNoParameter(typePart.body.patternList)) {
        return d.TsType.Union(
          typePart.body.patternList.map((pattern) =>
            d.TsType.StringLiteral(pattern.name)
          )
        );
      }
      return d.TsType.Union(
        typePart.body.patternList.map((pattern) =>
          patternListToObjectType(pattern, typePartDataMap)
        )
      );
    case "Product":
      return d.TsType.Object(
        typePart.body.memberList.map((member) => ({
          name: member.name,
          required: true,
          type: util.typeToTsType(member.type, typePartDataMap),
          document: member.description,
        }))
      );
    case "Kernel":
      return typePartBodyKernelToTsType(
        typePart,
        typePart.body.typePartBodyKernel
      );
  }
};

/**
 * コンパイラに向けた属性付きのDefinyの型をTypeScriptの型に変換する
 * @param typeAttribute
 */
const typePartWithAttributeToTsType = (
  typePart: d.TypePart,
  typeAttribute: d.TypeAttribute,
  typePartDataMap: ReadonlyMap<d.TypePartId, TypePartData>
): d.TsType => {
  switch (typeAttribute) {
    case "AsBoolean":
      if (
        typePart.body._ === "Sum" &&
        typePart.body.patternList.length === 2 &&
        typePart.body.patternList.every(
          (pattern) => pattern.parameter._ === "Nothing"
        )
      ) {
        return d.TsType.Boolean;
      }
      throw new Error(
        "attribute == Just(AsBoolean) type part need sum, have 2 patterns, All pattern parameters are empty"
      );
    case "AsUndefined":
      if (
        typePart.body._ === "Sum" &&
        typePart.body.patternList.length === 1 &&
        typePart.body.patternList.every(
          (pattern) => pattern.parameter._ === "Nothing"
        )
      ) {
        return d.TsType.Undefined;
      }
      throw new Error(
        "attribute == Just(AsUndefined) type part need sum and have 1 patterns, All pattern parameters are empty"
      );
    case "AsNumber": {
      if (typePart.body._ !== "Sum" || typePart.body.patternList.length !== 1) {
        throw new Error(
          "attribute == Just(AsNumber) type part need sum, have 1 patterns, parameters is int32"
        );
      }
      const firstPattern = typePart.body.patternList[0];
      if (firstPattern === undefined || firstPattern.parameter._ !== "Just") {
        throw new Error(
          "attribute == Just(AsNumber) type part need sum, have 1 patterns, parameters is int32"
        );
      }
      const parameterTypePart = typePartDataMap.get(
        firstPattern.parameter.value.output.typePartId
      );
      if (parameterTypePart === undefined) {
        throw new Error(
          `attribute == Just(AsNumber). parameter typePart not found. typePartId = ${firstPattern.parameter.value.output.typePartId}`
        );
      }
      if (
        parameterTypePart.tag !== "typePart" ||
        parameterTypePart.typePart.body._ !== "Kernel" ||
        parameterTypePart.typePart.body.typePartBodyKernel !== "Int32"
      ) {
        throw new Error(
          `attribute == Just(AsNumber). parameter typePart need typePartBody is Int32. typePartId = ${firstPattern.parameter.value.output.typePartId}`
        );
      }

      return d.TsType.Intersection({
        left: d.TsType.Number,
        right: d.TsType.Object([
          d.TsMemberType.helper({
            required: true,
            name: "_" + typePart.name,
            document: "",
            type: d.TsType.Never,
          }),
        ]),
      });
    }
  }
};

const patternListToObjectType = (
  patternList: d.Pattern,
  typePartDataMap: ReadonlyMap<d.TypePartId, TypePartData>
): d.TsType => {
  const tagField: d.TsMemberType = {
    name: "_",
    required: true,
    document: "",
    type: d.TsType.StringLiteral(patternList.name),
  };

  switch (patternList.parameter._) {
    case "Just":
      return d.TsType.Object([
        tagField,
        {
          name: util.typeToMemberOrParameterName(
            patternList.parameter.value,
            typePartDataMap
          ),
          required: true,
          document: "",
          type: util.typeToTsType(patternList.parameter.value, typePartDataMap),
        },
      ]);
    case "Nothing":
      return d.TsType.Object([tagField]);
  }
};

const typePartBodyKernelToTsType = (
  typePart: d.TypePart,
  kernel: d.TypePartBodyKernel
): d.TsType => {
  switch (kernel) {
    case "Int32":
      return d.TsType.Number;
    case "String":
      return d.TsType.String;
    case "Binary":
      return jsTs.uint8ArrayType;
    case "Id":
    case "Token":
      return d.TsType.Intersection({
        left: d.TsType.String,
        right: d.TsType.Object([
          {
            name: "_" + util.firstLowerCase(typePart.name),
            required: true,
            type: d.TsType.Never,
            document: "",
          },
        ]),
      });
    case "List": {
      const [elementType] = typePart.dataTypeParameterList;
      if (elementType === undefined) {
        throw new Error("List need one type parameter");
      }
      return jsTs.readonlyArrayType(
        d.TsType.ScopeInFile(jsTs.identiferFromString(elementType.name))
      );
    }
    case "Dict": {
      const [id, value] = typePart.dataTypeParameterList;
      if (id === undefined || value === undefined) {
        throw new Error("Dict need two type parameter");
      }
      return jsTs.readonlyMapType(
        d.TsType.ScopeInFile(jsTs.identiferFromString(id.name)),
        d.TsType.ScopeInFile(jsTs.identiferFromString(value.name))
      );
    }
  }
};
