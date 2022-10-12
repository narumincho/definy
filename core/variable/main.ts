import * as binary from "../kernelType/binary";
import * as codec from "../kernelType/codec";
import * as d from "../../localData";
import * as dict from "../kernelType/dict";
import * as hexString from "../kernelType/hexString";
import * as int32 from "../kernelType/int32";
import * as kernelString from "../kernelType/string";
import * as list from "../kernelType/list";
import * as util from "../util";
import { typePartIdMember, typePartIdMemberType } from "./typePartId";
import { typePartSumTagExpr, typePartSumTagType } from "./tag";
import { firstLowerCase } from "../../common/util";
import { jsTs } from "../../deno-lib/npm";

export const typePartMapToVariable = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): ReadonlyArray<jsTs.data.Variable> => {
  return [...typePartMap.values()].map((typePart) =>
    typePartToVariable(typePart, typePartMap)
  );
};

/**
 * definyの 型パーツ から TypeScript で実装時に使える便利な関数や定数を生成する
 */
const typePartToVariable = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): jsTs.data.Variable => {
  return {
    name: jsTs.identifierFromString(typePart.name),
    document: typePart.description + "\n@typePartId " + typePart.id,
    type: typePartToVariableType(typePart, typePartMap),
    expr: typePartToVariableExpr(typePart, typePartMap),
  };
};

const typePartToVariableType = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): jsTs.data.TsType => {
  const codecTsMemberType: jsTs.data.TsMemberType = {
    name: util.codecPropertyName,
    required: true,
    type: typePartToCodecType(typePart),
    document: "独自のバイナリ形式の変換処理ができるコーデック",
  };

  switch (typePart.body._) {
    case "Product": {
      /** ジェネリック付きの型 */
      const type: jsTs.data.TsType = {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: jsTs.identifierFromString(typePart.name),
          arguments: typePart.dataTypeParameterList.map((typeParameter) =>
            jsTs.typeScopeInFileNoArguments(
              jsTs.identifierFromString(typeParameter.name)
            )
          ),
        },
      };

      return jsTs.typeObject([
        typePartIdMemberType,
        codecTsMemberType,
        {
          name: util.helperName,
          document: "型を合わせる上で便利なヘルパー関数",
          required: true,
          type: {
            _: "Function",
            functionType: {
              typeParameterList: typePart.dataTypeParameterList.map(
                (typeParameter) => jsTs.identifierFromString(typeParameter.name)
              ),
              parameterList: [type],
              return: type,
            },
          },
        },
      ]);
    }
    case "Kernel": {
      if (
        typePart.body.typePartBodyKernel === d.TypePartBodyKernel.Id ||
        typePart.body.typePartBodyKernel === d.TypePartBodyKernel.Token
      ) {
        return jsTs.typeObject([
          typePartIdMemberType,
          codecTsMemberType,
          {
            name: util.fromStringPropertyName,
            document: "文字列から変換する",
            required: true,
            type: {
              _: "Function",
              functionType: {
                typeParameterList: [],
                parameterList: [{ _: "String" }],
                return: jsTs.typeScopeInFileNoArguments(
                  jsTs.identifierFromString(typePart.name)
                ),
              },
            },
          },
        ]);
      }
      return jsTs.typeObject([typePartIdMemberType, codecTsMemberType]);
    }

    case "Sum":
      return jsTs.typeObject([
        typePartIdMemberType,
        codecTsMemberType,
        ...typePartSumTagType(typePart, typePart.body.patternList, typePartMap),
      ]);
  }
};

const typePartToVariableExpr = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): jsTs.data.TsExpr => {
  switch (typePart.body._) {
    case "Product": {
      const parameterIdentifier = jsTs.identifierFromString(
        firstLowerCase(typePart.name)
      );
      /** ジェネリック付きの型 */
      const type: jsTs.data.TsType = {
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: jsTs.identifierFromString(typePart.name),
          arguments: typePart.dataTypeParameterList.map((typeParameter) =>
            jsTs.typeScopeInFileNoArguments(
              jsTs.identifierFromString(typeParameter.name)
            )
          ),
        },
      };
      return jsTs.objectLiteral([
        typePartIdMember(typePart.id),
        jsTs.memberKeyValue(util.helperName, {
          _: "Lambda",
          lambdaExpr: {
            parameterList: [
              {
                name: parameterIdentifier,
                type,
              },
            ],
            typeParameterList: typePart.dataTypeParameterList.map(
              (typeParameter) => jsTs.identifierFromString(typeParameter.name)
            ),
            returnType: type,
            statementList: [
              jsTs.statementReturn(jsTs.variable(parameterIdentifier)),
            ],
          },
        }),
        jsTs.memberKeyValue(
          util.codecPropertyName,
          codecExprDefinition(typePart, typePartMap)
        ),
      ]);
    }
    case "Kernel":
      return jsTs.objectLiteral([
        typePartIdMember(typePart.id),
        jsTs.memberKeyValue(
          util.codecPropertyName,
          codecExprDefinition(typePart, typePartMap)
        ),

        ...(typePart.body.typePartBodyKernel === d.TypePartBodyKernel.Id ||
        typePart.body.typePartBodyKernel === d.TypePartBodyKernel.Token
          ? [
              jsTs.memberKeyValue(util.fromStringPropertyName, {
                _: "Lambda",
                lambdaExpr: {
                  typeParameterList: [],
                  parameterList: [
                    {
                      name: jsTs.identifierFromString("str"),
                      type: { _: "String" },
                    },
                  ],
                  returnType: jsTs.typeScopeInFileNoArguments(
                    jsTs.identifierFromString(typePart.name)
                  ),
                  statementList: [
                    jsTs.statementReturn({
                      _: "TypeAssertion",
                      typeAssertion: {
                        expr: jsTs.variable(jsTs.identifierFromString("str")),
                        type: jsTs.typeScopeInFileNoArguments(
                          jsTs.identifierFromString(typePart.name)
                        ),
                      },
                    }),
                  ],
                },
              }),
            ]
          : []),
      ]);

    case "Sum": {
      return jsTs.objectLiteral([
        ...typePartSumTagExpr(typePart, typePart.body.patternList, typePartMap),
        typePartIdMember(typePart.id),
        jsTs.memberKeyValue(
          util.codecPropertyName,
          codecExprDefinition(typePart, typePartMap)
        ),
      ]);
    }
  }
};

/** カスタム型の式のcodecプロパティの型 */
const typePartToCodecType = (typePart: d.TypePart): jsTs.data.TsType =>
  codec.codecTypeWithTypeParameter(
    jsTs.identifierFromString(typePart.name),
    typePart.dataTypeParameterList.map((typeParameter) => typeParameter.name)
  );

const codecExprDefinition = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): jsTs.data.TsExpr => {
  if (typePart.dataTypeParameterList.length === 0) {
    return codecDefinitionBodyExpr(typePart, typePartMap);
  }
  return {
    _: "Lambda",
    lambdaExpr: {
      typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
        jsTs.identifierFromString(typeParameter.name)
      ),
      parameterList: typePart.dataTypeParameterList.map((typeParameter) => ({
        name: codec.codecParameterName(typeParameter.name),
        type: codec.codecType(
          jsTs.typeScopeInFileNoArguments(
            jsTs.identifierFromString(typeParameter.name)
          )
        ),
      })),
      returnType: codec.codecType({
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: jsTs.identifierFromString(typePart.name),
          arguments: typePart.dataTypeParameterList.map((typeParameter) =>
            jsTs.typeScopeInFileNoArguments(
              jsTs.identifierFromString(typeParameter.name)
            )
          ),
        },
      }),
      statementList: [
        jsTs.statementReturn(codecDefinitionBodyExpr(typePart, typePartMap)),
      ],
    },
  };
};

const codecDefinitionBodyExpr = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): jsTs.data.TsExpr => {
  return jsTs.objectLiteral([
    jsTs.memberKeyValue(
      util.encodePropertyName,
      encodeExprDefinition(typePart, typePartMap)
    ),
    jsTs.memberKeyValue(
      util.decodePropertyName,
      decodeExprDefinition(typePart, typePartMap)
    ),
  ]);
};

/**
 * Encode Definition
 */
const encodeExprDefinition = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): jsTs.data.TsExpr =>
  codec.encodeLambda(
    {
      _: "ScopeInFile",
      typeNameAndTypeParameter: {
        name: jsTs.identifierFromString(typePart.name),
        arguments: typePart.dataTypeParameterList.map((typeParameter) =>
          jsTs.typeScopeInFileNoArguments(
            jsTs.identifierFromString(typeParameter.name)
          )
        ),
      },
    },
    (valueVar): ReadonlyArray<jsTs.data.Statement> => {
      switch (typePart.body._) {
        case "Product":
          return productEncodeDefinitionStatementList(
            typePart.body.memberList,
            valueVar,
            typePartMap,
            typePart.dataTypeParameterList
          );
        case "Sum":
          if (typePart.attribute._ === "Just") {
            return encodeStatementListWithAttribute(
              valueVar,
              typePart.attribute.value
            );
          }
          return sumEncodeDefinitionStatementList(
            typePart.body.patternList,
            valueVar,
            typePartMap,
            typePart.dataTypeParameterList
          );
        case "Kernel":
          return kernelEncodeDefinitionStatementList(
            typePart.body.typePartBodyKernel,
            valueVar,
            typePart
          );
      }
    }
  );

const encodeStatementListWithAttribute = (
  valueVar: jsTs.data.TsExpr,
  typeAttribute: d.TypeAttribute
): ReadonlyArray<jsTs.data.Statement> => {
  switch (typeAttribute) {
    case "AsBoolean":
      return [
        jsTs.statementReturn({
          _: "ArrayLiteral",
          arrayItemList: [
            {
              expr: {
                _: "ConditionalOperator",
                conditionalOperatorExpr: {
                  condition: valueVar,
                  thenExpr: jsTs.numberLiteral(1),
                  elseExpr: jsTs.numberLiteral(0),
                },
              },
              spread: false,
            },
          ],
        }),
      ];
    case "AsUndefined":
      return [jsTs.statementReturn({ _: "ArrayLiteral", arrayItemList: [] })];
    case "AsNumber":
      return int32.encodeDefinitionStatementList(valueVar);
  }
};

const productEncodeDefinitionStatementList = (
  memberList: ReadonlyArray<d.Member>,
  parameter: jsTs.data.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): ReadonlyArray<jsTs.data.Statement> => {
  const [firstMember] = memberList;
  if (firstMember === undefined) {
    return [jsTs.statementReturn({ _: "ArrayLiteral", arrayItemList: [] })];
  }
  let e = jsTs.call({
    expr: jsTs.get(
      codecExprUse(
        firstMember.type,
        typePartMap,
        scopeTypePartDataTypeParameterList
      ),
      util.encodePropertyName
    ),
    parameterList: [jsTs.get(parameter, firstMember.name)],
  });
  for (const member of memberList.slice(1)) {
    e = jsTs.callMethod(e, "concat", [
      jsTs.call({
        expr: jsTs.get(
          codecExprUse(
            member.type,
            typePartMap,
            scopeTypePartDataTypeParameterList
          ),
          util.encodePropertyName
        ),
        parameterList: [jsTs.get(parameter, member.name)],
      }),
    ]);
  }
  return [jsTs.statementReturn(e)];
};

const sumEncodeDefinitionStatementList = (
  patternList: ReadonlyArray<d.Pattern>,
  parameter: jsTs.data.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): ReadonlyArray<jsTs.data.Statement> => [
  {
    _: "Switch",
    switchStatement: {
      expr: util.isTagTypeAllNoParameter(patternList)
        ? parameter
        : jsTs.get(parameter, "_"),
      patternList: patternList.map((pattern, index) =>
        patternToSwitchPattern(
          pattern,
          index,
          parameter,
          typePartMap,
          scopeTypePartDataTypeParameterList
        )
      ),
    },
  },
];

const patternToSwitchPattern = (
  patternList: d.Pattern,
  index: number,
  parameter: jsTs.data.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): jsTs.data.TsPattern => {
  const returnExpr = ((): jsTs.data.TsExpr => {
    switch (patternList.parameter._) {
      case "Just":
        return jsTs.callMethod(
          jsTs.arrayLiteral([
            { expr: jsTs.numberLiteral(index), spread: false },
          ]),
          "concat",
          [
            encodeExprUse(
              patternList.parameter.value,
              jsTs.get(
                parameter,
                util.typeToMemberOrParameterName(
                  patternList.parameter.value,
                  typePartMap,
                  scopeTypePartDataTypeParameterList
                )
              ),
              typePartMap,
              scopeTypePartDataTypeParameterList
            ),
          ]
        );

      case "Nothing":
        return jsTs.arrayLiteral([
          { expr: jsTs.numberLiteral(index), spread: false },
        ]);
    }
  })();
  return {
    caseString: patternList.name,
    statementList: [jsTs.statementReturn(returnExpr)],
  };
};

const kernelEncodeDefinitionStatementList = (
  typePartBodyKernel: d.TypePartBodyKernel,
  valueVar: jsTs.data.TsExpr,
  typePart: d.TypePart
): ReadonlyArray<jsTs.data.Statement> => {
  switch (typePartBodyKernel) {
    case "Int32":
      return int32.encodeDefinitionStatementList(valueVar);
    case "String":
      return kernelString.encodeDefinitionStatementList(valueVar);
    case "Binary":
      return binary.encodeDefinitionStatementList(valueVar);
    case "Id":
      return hexString.idEncodeDefinitionStatementList(valueVar);
    case "Token":
      return hexString.tokenEncodeDefinitionStatementList(valueVar);
    case "List": {
      const [elementType] = typePart.dataTypeParameterList;
      if (elementType === undefined) {
        throw new Error("List type need one type parameter");
      }
      return list.encodeDefinitionStatementList(elementType.name, valueVar);
    }
    case "Dict": {
      const [key, value] = typePart.dataTypeParameterList;
      if (key === undefined || value === undefined) {
        throw new Error("Dict need 2 type parameters");
      }
      return dict.encodeDefinitionStatementList(key.name, value.name, valueVar);
    }
  }
};

/**
 * Decode Definition
 */
const decodeExprDefinition = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): jsTs.data.TsExpr => {
  return codec.decodeLambda(
    {
      _: "ScopeInFile",
      typeNameAndTypeParameter: {
        name: jsTs.identifierFromString(typePart.name),
        arguments: typePart.dataTypeParameterList.map((typeParameter) =>
          jsTs.typeScopeInFileNoArguments(
            jsTs.identifierFromString(typeParameter.name)
          )
        ),
      },
    },
    (parameterIndex, parameterBinary): ReadonlyArray<jsTs.data.Statement> => {
      switch (typePart.body._) {
        case "Product":
          return productDecodeDefinitionStatementList(
            typePart.body.memberList,
            parameterIndex,
            parameterBinary,
            typePartMap,
            typePart.dataTypeParameterList
          );
        case "Sum":
          if (typePart.attribute._ === "Just") {
            if (typePart.attribute.value === "AsUndefined") {
              const [unitPattern] = typePart.body.patternList;
              if (unitPattern === undefined) {
                throw new Error(
                  "attribute == Just(AsUndefined) need 1  pattern !"
                );
              }
              return [
                codec.returnStatement(
                  patternUse(typePart.name, true, unitPattern.name, undefined),
                  parameterIndex
                ),
              ];
            }
            if (typePart.attribute.value === "AsNumber") {
              const [unitPattern] = typePart.body.patternList;
              if (unitPattern === undefined) {
                throw new Error("attribute == Just(AsNumber) need 1 pattern !");
              }
              const decodedInt32Identifier =
                jsTs.identifierFromString("decodedInt32");
              return [
                jsTs.statementVariableDefinition({
                  isConst: true,
                  name: decodedInt32Identifier,
                  expr: int32.decode(parameterIndex, parameterBinary),
                  type: codec.decodeReturnType({ _: "Number" }),
                }),
                codec.returnStatement(
                  patternUse(
                    typePart.name,
                    true,
                    unitPattern.name,
                    codec.getResult(jsTs.variable(decodedInt32Identifier))
                  ),
                  codec.getNextIndex(jsTs.variable(decodedInt32Identifier))
                ),
              ];
            }
          }

          return sumDecodeDefinitionStatementList(
            typePart.body.patternList,
            typePart.name,
            parameterIndex,
            parameterBinary,
            typePart.dataTypeParameterList.length === 0,
            typePartMap,
            typePart.dataTypeParameterList
          );
        case "Kernel":
          return kernelDecodeDefinitionStatementList(
            typePart.body.typePartBodyKernel,
            typePart,
            parameterIndex,
            parameterBinary
          );
      }
    }
  );
};

const productDecodeDefinitionStatementList = (
  memberList: ReadonlyArray<d.Member>,
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): ReadonlyArray<jsTs.data.Statement> => {
  const resultAndNextIndexNameIdentifier = (
    member: d.Member
  ): jsTs.TsIdentifier =>
    jsTs.identifierFromString(member.name + "AndNextIndex");

  const memberDecoderCode = memberList.reduce<{
    nextIndexExpr: jsTs.data.TsExpr;
    statementList: ReadonlyArray<jsTs.data.Statement>;
  }>(
    (statementAndNextIndexExpr, memberNameAndType) => {
      const resultAndNextIndexName =
        resultAndNextIndexNameIdentifier(memberNameAndType);
      const resultAndNextIndexVar = jsTs.variable(resultAndNextIndexName);

      return {
        nextIndexExpr: codec.getNextIndex(resultAndNextIndexVar),
        statementList: statementAndNextIndexExpr.statementList.concat(
          jsTs.statementVariableDefinition({
            isConst: true,
            name: resultAndNextIndexName,
            type: codec.decodeReturnType(
              util.typeToTsType(
                memberNameAndType.type,
                typePartMap,
                scopeTypePartDataTypeParameterList
              )
            ),
            expr: decodeExprUse(
              memberNameAndType.type,
              statementAndNextIndexExpr.nextIndexExpr,
              parameterBinary,
              typePartMap,
              scopeTypePartDataTypeParameterList
            ),
          })
        ),
      };
    },
    { nextIndexExpr: parameterIndex, statementList: [] }
  );
  return memberDecoderCode.statementList.concat(
    codec.returnStatement(
      jsTs.objectLiteral(
        memberList.map(
          (memberNameAndType): jsTs.data.TsMember =>
            jsTs.memberKeyValue(
              memberNameAndType.name,
              codec.getResult(
                jsTs.variable(
                  resultAndNextIndexNameIdentifier(memberNameAndType)
                )
              )
            )
        )
      ),
      memberDecoderCode.nextIndexExpr
    )
  );
};

const sumDecodeDefinitionStatementList = (
  patternList: ReadonlyArray<d.Pattern>,
  typePartName: string,
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr,
  noTypeParameter: boolean,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): ReadonlyArray<jsTs.data.Statement> => {
  const patternIndexAndNextIndexName =
    jsTs.identifierFromString("patternIndex");
  const patternIndexAndNextIndexVar = jsTs.variable(
    patternIndexAndNextIndexName
  );

  return [
    jsTs.statementVariableDefinition({
      isConst: true,
      name: patternIndexAndNextIndexName,
      type: codec.decodeReturnType({ _: "Number" }),
      expr: int32.decode(parameterIndex, parameterBinary),
    }),
    ...patternList.map((pattern, index) =>
      tagPatternCode(
        typePartName,
        pattern,
        index,
        patternIndexAndNextIndexVar,
        parameterBinary,
        noTypeParameter,
        typePartMap,
        scopeTypePartDataTypeParameterList
      )
    ),
    {
      _: "ThrowError",
      tsExpr: jsTs.stringLiteral(
        "存在しないパターンを指定された 型を更新してください"
      ),
    },
  ];
};

const tagPatternCode = (
  typePartName: string,
  pattern: d.Pattern,
  index: number,
  patternIndexAndNextIndexVar: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr,
  noTypeParameter: boolean,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): jsTs.data.Statement => {
  switch (pattern.parameter._) {
    case "Just":
      return jsTs.statementIf({
        condition: jsTs.equal(
          codec.getResult(patternIndexAndNextIndexVar),
          jsTs.numberLiteral(index)
        ),
        thenStatementList: [
          jsTs.statementVariableDefinition({
            isConst: true,
            name: jsTs.identifierFromString("result"),
            type: codec.decodeReturnType(
              util.typeToTsType(
                pattern.parameter.value,
                typePartMap,
                scopeTypePartDataTypeParameterList
              )
            ),
            expr: decodeExprUse(
              pattern.parameter.value,
              codec.getNextIndex(patternIndexAndNextIndexVar),
              parameterBinary,
              typePartMap,
              scopeTypePartDataTypeParameterList
            ),
          }),
          codec.returnStatement(
            patternUse(
              typePartName,
              noTypeParameter,
              pattern.name,
              codec.getResult(
                jsTs.variable(jsTs.identifierFromString("result"))
              )
            ),
            codec.getNextIndex(
              jsTs.variable(jsTs.identifierFromString("result"))
            )
          ),
        ],
      });
    case "Nothing":
      return jsTs.statementIf({
        condition: jsTs.equal(
          codec.getResult(patternIndexAndNextIndexVar),
          jsTs.numberLiteral(index)
        ),
        thenStatementList: [
          codec.returnStatement(
            patternUse(typePartName, noTypeParameter, pattern.name, undefined),
            codec.getNextIndex(patternIndexAndNextIndexVar)
          ),
        ],
      });
  }
};

const kernelDecodeDefinitionStatementList = (
  typePartBodyKernel: d.TypePartBodyKernel,
  typePart: d.TypePart,
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  switch (typePartBodyKernel) {
    case "Int32":
      return int32.decodeDefinitionStatementList(
        parameterIndex,
        parameterBinary
      );
    case "String":
      return kernelString.decodeDefinitionStatementList(
        parameterIndex,
        parameterBinary
      );
    case "Binary":
      return binary.decodeDefinitionStatementList(
        parameterIndex,
        parameterBinary
      );
    case "Id":
      return hexString.idDecodeDefinitionStatementList(
        typePart.name,
        parameterIndex,
        parameterBinary
      );
    case "Token":
      return hexString.tokenDecodeDefinitionStatementList(
        typePart.name,
        parameterIndex,
        parameterBinary
      );
    case "List": {
      const [elementType] = typePart.dataTypeParameterList;
      if (elementType === undefined) {
        throw new Error("List type need one type paramter");
      }
      return list.decodeDefinitionStatementList(
        elementType.name,
        parameterIndex,
        parameterBinary
      );
    }
    case "Dict": {
      const [key, value] = typePart.dataTypeParameterList;
      if (key === undefined || value === undefined) {
        throw new Error("Dict need 2 type parameters");
      }
      return dict.decodeDefinitionStatementList(
        key.name,
        value.name,
        parameterIndex,
        parameterBinary
      );
    }
  }
};

const patternUse = (
  typePartName: string,
  noTypeParameter: boolean,
  tagName: string,
  parameter: jsTs.data.TsExpr | undefined
): jsTs.data.TsExpr => {
  const tagExpr = jsTs.get(
    jsTs.variable(jsTs.identifierFromString(typePartName)),
    tagName
  );
  if (parameter === undefined) {
    if (noTypeParameter) {
      return tagExpr;
    }
    return {
      _: "Call",
      callExpr: {
        expr: tagExpr,
        parameterList: [],
      },
    };
  }
  return {
    _: "Call",
    callExpr: {
      expr: tagExpr,
      parameterList: [parameter],
    },
  };
};

const encodeExprUse = (
  type_: d.Type,
  target: jsTs.data.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): jsTs.data.TsExpr => ({
  _: "Call",
  callExpr: {
    expr: jsTs.get(
      codecExprUse(type_, typePartMap, scopeTypePartDataTypeParameterList),
      util.encodePropertyName
    ),
    parameterList: [target],
  },
});

const decodeExprUse = (
  type_: d.Type,
  indexExpr: jsTs.data.TsExpr,
  binaryExpr: jsTs.data.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): jsTs.data.TsExpr => ({
  _: "Call",
  callExpr: {
    expr: jsTs.get(
      codecExprUse(type_, typePartMap, scopeTypePartDataTypeParameterList),
      util.decodePropertyName
    ),
    parameterList: [indexExpr, binaryExpr],
  },
});

const codecExprUse = (
  type: d.Type,
  typePartDataMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): jsTs.data.TsExpr => {
  return dataTypeCodecExprUse(
    type.output,
    typePartDataMap,
    scopeTypePartDataTypeParameterList
  );
};

const dataTypeCodecExprUse = (
  dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter,
  typePartDataMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): jsTs.data.TsExpr => {
  switch (dataTypeOrDataTypeParameter._) {
    case "DataType": {
      const typePart = typePartDataMap.get(
        dataTypeOrDataTypeParameter.dataType.typePartId
      );
      if (typePart === undefined) {
        throw new Error(
          "internal error not found type part name in codecExprUse. typePartId =" +
            dataTypeOrDataTypeParameter.dataType.typePartId
        );
      }
      if (dataTypeOrDataTypeParameter.dataType.arguments.length === 0) {
        return jsTs.get(
          jsTs.variable(jsTs.identifierFromString(typePart.name)),
          util.codecPropertyName
        );
      }
      return jsTs.call({
        expr: jsTs.get(
          jsTs.variable(jsTs.identifierFromString(typePart.name)),
          util.codecPropertyName
        ),
        parameterList: dataTypeOrDataTypeParameter.dataType.arguments.map(
          (parameter) =>
            dataTypeCodecExprUse(
              parameter,
              typePartDataMap,
              scopeTypePartDataTypeParameterList
            )
        ),
      });
    }
    case "DataTypeParameter": {
      const dataTypeParameter =
        scopeTypePartDataTypeParameterList[dataTypeOrDataTypeParameter.int32];
      if (dataTypeParameter === undefined) {
        throw new Error(
          `internal error, data type parameter index. 0 <= ${dataTypeOrDataTypeParameter.int32} < ${scopeTypePartDataTypeParameterList.length}`
        );
      }
      return jsTs.variable(codec.codecParameterName(dataTypeParameter.name));
    }
  }
};
