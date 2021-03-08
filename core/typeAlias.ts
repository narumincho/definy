import * as codec from "./kernelType/codec";
import * as data from "./data";
import * as identifer from "js-ts-code-generator/identifer";
import * as ts from "js-ts-code-generator/data";
import * as tsUtil from "js-ts-code-generator/util";
import * as util from "./util";

export const typePartMapToTypeAlias = (
  typePartMap: ReadonlyMap<data.TypePartId, data.TypePart>,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<ts.TypeAlias> => {
  return [
    codec.codecTypeAlias(),
    ...[...typePartMap].map(([typePartId, typePart]) =>
      typePartToTypeAlias(typePartId, typePart, allTypePartIdTypePartNameMap)
    ),
  ];
};

export const typePartToTypeAlias = (
  typePartId: data.TypePartId,
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ts.TypeAlias => ({
  name: identifer.fromString(typePart.name),
  document: typePart.description + "\n@typePartId " + (typePartId as string),
  typeParameterList: typePart.typeParameterList.map((typeParameter) =>
    identifer.fromString(typeParameter.name)
  ),
  type: typePartToTsType(typePart, allTypePartIdTypePartNameMap),
});

const typePartToTsType = (
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ts.Type => {
  if (typePart.attribute._ === "Just") {
    return typePartWIthAttributeToTsType(typePart, typePart.attribute.value);
  }
  switch (typePart.body._) {
    case "Sum":
      if (util.isTagTypeAllNoParameter(typePart.body.patternList)) {
        return ts.Type.Union(
          typePart.body.patternList.map((pattern) =>
            ts.Type.StringLiteral(pattern.name)
          )
        );
      }
      return ts.Type.Union(
        typePart.body.patternList.map((pattern) =>
          patternListToObjectType(pattern, allTypePartIdTypePartNameMap)
        )
      );
    case "Product":
      return ts.Type.Object(
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
  typePart: data.TypePart,
  typeAttribute: data.TypeAttribute
): ts.Type => {
  switch (typeAttribute) {
    case "AsBoolean":
      if (
        typePart.body._ === "Sum" &&
        typePart.body.patternList.length === 2 &&
        typePart.body.patternList.every(
          (pattern) => pattern.parameter._ === "Nothing"
        )
      ) {
        return ts.Type.Boolean;
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
        return ts.Type.Undefined;
      }
      throw new Error(
        "attribute == Just(AsUndefined) type part need sum and have 1 patterns, All pattern parameters are empty"
      );
  }
};

const patternListToObjectType = (
  patternList: data.Pattern,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ts.Type => {
  const tagField: ts.MemberType = {
    name: "_",
    required: true,
    document: "",
    type: ts.Type.StringLiteral(patternList.name),
  };

  switch (patternList.parameter._) {
    case "Just":
      return ts.Type.Object([
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
      return ts.Type.Object([tagField]);
  }
};

const typePartBodyKernelToTsType = (
  typePart: data.TypePart,
  kernel: data.TypePartBodyKernel
): ts.Type => {
  switch (kernel) {
    case "Function": {
      const [inputType, outputType] = typePart.typeParameterList;
      if (inputType === undefined || outputType === undefined) {
        throw new Error("kernel function type need 2 type parameter");
      }
      return ts.Type.Function({
        parameterList: [
          ts.Type.ScopeInFile(identifer.fromString(inputType.name)),
        ],
        return: ts.Type.ScopeInFile(identifer.fromString(outputType.name)),
        typeParameterList: [],
      });
    }
    case "Int32":
      return ts.Type.Number;
    case "String":
      return ts.Type.String;
    case "Binary":
      return tsUtil.uint8ArrayType;
    case "Id":
    case "Token":
      return ts.Type.Intersection({
        left: ts.Type.String,
        right: ts.Type.Object([
          {
            name: "_" + util.firstLowerCase(typePart.name),
            required: true,
            type: ts.Type.Never,
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
        ts.Type.ScopeInFile(identifer.fromString(elementType.name))
      );
    }
    case "Dict": {
      const [id, value] = typePart.typeParameterList;
      if (id === undefined || value === undefined) {
        throw new Error("Dict need two type parameter");
      }
      return tsUtil.readonlyMapType(
        ts.Type.ScopeInFile(identifer.fromString(id.name)),
        ts.Type.ScopeInFile(identifer.fromString(value.name))
      );
    }
  }
};
