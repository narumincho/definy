import * as codec from "./kernelType/codec";
import * as d from "../data";
import * as util from "./util";
import { identifer, util as tsUtil } from "../gen/jsTs/main";

export const typePartMapToTypeAlias = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  allTypePartIdTypePartNameMap: ReadonlyMap<d.TypePartId, string>
): ReadonlyArray<d.TypeAlias> => {
  return [
    codec.codecTypeAlias(),
    ...[...typePartMap].map(([typePartId, typePart]) =>
      typePartToTypeAlias(typePartId, typePart, allTypePartIdTypePartNameMap)
    ),
  ];
};

export const typePartToTypeAlias = (
  typePartId: d.TypePartId,
  typePart: d.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<d.TypePartId, string>
): d.TypeAlias => ({
  name: identifer.fromString(typePart.name),
  document: typePart.description + "\n@typePartId " + (typePartId as string),
  typeParameterList: typePart.typeParameterList.map((typeParameter) =>
    identifer.fromString(typeParameter.name)
  ),
  type: typePartToTsType(typePart, allTypePartIdTypePartNameMap),
});

const typePartToTsType = (
  typePart: d.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<d.TypePartId, string>
): d.TsType => {
  if (typePart.attribute._ === "Just") {
    return typePartWIthAttributeToTsType(typePart, typePart.attribute.value);
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
          patternListToObjectType(pattern, allTypePartIdTypePartNameMap)
        )
      );
    case "Product":
      return d.TsType.Object(
        typePart.body.memberList.map((member) => ({
          name: member.name,
          required: true,
          type: util.typeToTsType(member.type, allTypePartIdTypePartNameMap),
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
const typePartWIthAttributeToTsType = (
  typePart: d.TypePart,
  typeAttribute: d.TypeAttribute
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
  }
};

const patternListToObjectType = (
  patternList: d.Pattern,
  allTypePartIdTypePartNameMap: ReadonlyMap<d.TypePartId, string>
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
            allTypePartIdTypePartNameMap
          ),
          required: true,
          document: "",
          type: util.typeToTsType(
            patternList.parameter.value,
            allTypePartIdTypePartNameMap
          ),
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
    case "Function": {
      const [inputType, outputType] = typePart.typeParameterList;
      if (inputType === undefined || outputType === undefined) {
        throw new Error("kernel function type need 2 type parameter");
      }
      return d.TsType.Function({
        parameterList: [
          d.TsType.ScopeInFile(identifer.fromString(inputType.name)),
        ],
        return: d.TsType.ScopeInFile(identifer.fromString(outputType.name)),
        typeParameterList: [],
      });
    }
    case "Int32":
      return d.TsType.Number;
    case "String":
      return d.TsType.String;
    case "Binary":
      return tsUtil.uint8ArrayType;
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
      const [elementType] = typePart.typeParameterList;
      if (elementType === undefined) {
        throw new Error("List need one type parameter");
      }
      return tsUtil.readonlyArrayType(
        d.TsType.ScopeInFile(identifer.fromString(elementType.name))
      );
    }
    case "Dict": {
      const [id, value] = typePart.typeParameterList;
      if (id === undefined || value === undefined) {
        throw new Error("Dict need two type parameter");
      }
      return tsUtil.readonlyMapType(
        d.TsType.ScopeInFile(identifer.fromString(id.name)),
        d.TsType.ScopeInFile(identifer.fromString(value.name))
      );
    }
  }
};
