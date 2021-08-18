import * as codec from "./kernelType/codec";
import * as d from "../localData";
import * as util from "./util";
import type { TypePartIdAndMessage } from "./TypePartIdAndMessage";
import { jsTs } from "../gen/main";

export const typePartMapToTypeAlias = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.Result<
  ReadonlyArray<d.TypeAlias>,
  ReadonlyArray<TypePartIdAndMessage>
> => {
  const typeAliasList: Array<d.TypeAlias> = [];
  const errorList: Array<TypePartIdAndMessage> = [];
  for (const typePart of typePartMap.values()) {
    const result = typePartToTypeAlias(typePart, typePartMap);
    if (result._ === "Error") {
      errorList.push({
        typePartId: typePart.id,
        message: result.error,
      });
    } else {
      typeAliasList.push(result.ok);
    }
  }
  if (errorList.length === 0) {
    return d.Result.Ok([codec.codecTypeAlias(), ...typeAliasList]);
  }
  return d.Result.Error(errorList);
};

export const typePartToTypeAlias = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.Result<d.TypeAlias, string> => {
  const tsType = typePartToTsType(typePart, typePartMap);
  if (tsType._ === "Error") {
    return d.Result.Error(tsType.error);
  }
  return d.Result.Ok({
    name: jsTs.identiferFromString(typePart.name),
    document: typePart.description + "\n@typePartId " + (typePart.id as string),
    typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
      jsTs.identiferFromString(typeParameter.name)
    ),
    type: tsType.ok,
  });
};

const typePartToTsType = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.Result<d.TsType, string> => {
  if (typePart.attribute._ === "Just") {
    return typePartWithAttributeToTsType(
      typePart,
      typePart.attribute.value,
      typePartMap
    );
  }
  switch (typePart.body._) {
    case "Sum":
      if (util.isTagTypeAllNoParameter(typePart.body.patternList)) {
        return d.Result.Ok(
          d.TsType.Union(
            typePart.body.patternList.map((pattern) =>
              d.TsType.StringLiteral(pattern.name)
            )
          )
        );
      }
      return d.Result.Ok(
        d.TsType.Union(
          typePart.body.patternList.map((pattern) =>
            patternListToObjectType(
              pattern,
              typePartMap,
              typePart.dataTypeParameterList
            )
          )
        )
      );
    case "Product":
      return d.Result.Ok(
        d.TsType.Object(
          typePart.body.memberList.map((member) => ({
            name: member.name,
            required: true,
            type: util.typeToTsType(
              member.type,
              typePartMap,
              typePart.dataTypeParameterList
            ),
            document: member.description,
          }))
        )
      );
    case "Kernel":
      return d.Result.Ok(
        typePartBodyKernelToTsType(typePart, typePart.body.typePartBodyKernel)
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
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.Result<d.TsType, string> => {
  switch (typeAttribute) {
    case "AsBoolean":
      if (
        typePart.body._ === "Sum" &&
        typePart.body.patternList.length === 2 &&
        typePart.body.patternList.every(
          (pattern) => pattern.parameter._ === "Nothing"
        )
      ) {
        return d.Result.Ok(d.TsType.Boolean);
      }
      return d.Result.Error(
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
        return d.Result.Ok(d.TsType.Undefined);
      }
      return d.Result.Error(
        "attribute == Just(AsUndefined) type part need sum and have 1 patterns, All pattern parameters are empty"
      );
    case "AsNumber": {
      if (typePart.body._ !== "Sum" || typePart.body.patternList.length !== 1) {
        return d.Result.Error(
          "attribute == Just(AsNumber) type part need sum, have 1 patterns, parameters is int32"
        );
      }
      const firstPattern = typePart.body.patternList[0];
      if (firstPattern === undefined || firstPattern.parameter._ !== "Just") {
        return d.Result.Error(
          "attribute == Just(AsNumber) type part need sum, have 1 patterns, parameters is int32"
        );
      }
      if (firstPattern.parameter.value.output._ !== "DataType") {
        return d.Result.Error(
          "attribute == Just(AsNumber) type part need sum, have 1 patterns, parameters is int32 but use data type parameter"
        );
      }
      const parameterTypePart = typePartMap.get(
        firstPattern.parameter.value.output.dataType.typePartId
      );
      if (parameterTypePart === undefined) {
        return d.Result.Error(
          `attribute == Just(AsNumber). parameter typePart not found. typePartId = ${firstPattern.parameter.value.output.dataType.typePartId}`
        );
      }
      if (
        parameterTypePart.body._ !== "Kernel" ||
        parameterTypePart.body.typePartBodyKernel !== "Int32"
      ) {
        return d.Result.Error(
          `attribute == Just(AsNumber). parameter typePart need typePartBody is Int32. typePartId = ${firstPattern.parameter.value.output.dataType.typePartId}`
        );
      }

      return d.Result.Ok(
        d.TsType.Intersection({
          left: d.TsType.Number,
          right: d.TsType.Object([
            d.TsMemberType.helper({
              required: true,
              name: "_" + typePart.name,
              document: "",
              type: d.TsType.Never,
            }),
          ]),
        })
      );
    }
  }
};

const patternListToObjectType = (
  patternList: d.Pattern,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
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
            typePartMap,
            scopeTypePartDataTypeParameterList
          ),
          required: true,
          document: "",
          type: util.typeToTsType(
            patternList.parameter.value,
            typePartMap,
            scopeTypePartDataTypeParameterList
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
