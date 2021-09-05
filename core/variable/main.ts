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
import { jsTs } from "../../gen/main";

export const typePartMapToVariable = (
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): ReadonlyArray<d.Variable> => {
  return [...typePartMap.values()].map((typePart) =>
    typePartToVariable(typePart, typePartMap)
  );
};

/**
 * Definyの 型パーツ から TypeScript で実装時に使える便利な関数や定数を生成する
 */
const typePartToVariable = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.Variable => {
  return {
    name: jsTs.identiferFromString(typePart.name),
    document: typePart.description + "\n@typePartId " + typePart.id,
    type: typePartToVariableType(typePart, typePartMap),
    expr: typePartToVariableExpr(typePart, typePartMap),
  };
};

const typePartToVariableType = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.TsType => {
  const codecTsMemberType: d.TsMemberType = {
    name: util.codecPropertyName,
    required: true,
    type: typePartToCodecType(typePart),
    document: "独自のバイナリ形式の変換処理ができるコーデック",
  };

  switch (typePart.body._) {
    case "Product": {
      /** ジェネリック付きの型 */
      const type = d.TsType.WithTypeParameter({
        type: d.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
        typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
          d.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
        ),
      });
      return d.TsType.Object([
        typePartIdMemberType,
        codecTsMemberType,
        {
          name: util.helperName,
          document: "型を合わせる上で便利なヘルパー関数",
          required: true,
          type: d.TsType.Function({
            typeParameterList: typePart.dataTypeParameterList.map(
              (typeParameter) => jsTs.identiferFromString(typeParameter.name)
            ),
            parameterList: [type],
            return: type,
          }),
        },
      ]);
    }
    case "Kernel": {
      if (
        typePart.body.typePartBodyKernel === d.TypePartBodyKernel.Id ||
        typePart.body.typePartBodyKernel === d.TypePartBodyKernel.Token
      ) {
        return d.TsType.Object([
          typePartIdMemberType,
          codecTsMemberType,
          {
            name: util.fromStringPropertyName,
            document: "文字列から変換する",
            required: true,
            type: d.TsType.Function({
              typeParameterList: [],
              parameterList: [d.TsType.String],
              return: d.TsType.ScopeInFile(
                jsTs.identiferFromString(typePart.name)
              ),
            }),
          },
        ]);
      }
      return d.TsType.Object([typePartIdMemberType, codecTsMemberType]);
    }

    case "Sum":
      return d.TsType.Object([
        typePartIdMemberType,
        codecTsMemberType,
        ...typePartSumTagType(typePart, typePart.body.patternList, typePartMap),
      ]);
  }
};

const typePartToVariableExpr = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.TsExpr => {
  switch (typePart.body._) {
    case "Product": {
      const parameterIdentifer = jsTs.identiferFromString(
        util.firstLowerCase(typePart.name)
      );
      /** ジェネリック付きの型 */
      const type = d.TsType.WithTypeParameter({
        type: d.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
        typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
          d.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
        ),
      });
      return d.TsExpr.ObjectLiteral([
        typePartIdMember(typePart.id),
        d.TsMember.KeyValue({
          key: util.helperName,
          value: d.TsExpr.Lambda({
            parameterList: [
              {
                name: parameterIdentifer,
                type,
              },
            ],
            typeParameterList: typePart.dataTypeParameterList.map(
              (typeParameter) => jsTs.identiferFromString(typeParameter.name)
            ),
            returnType: type,
            statementList: [
              d.Statement.Return(d.TsExpr.Variable(parameterIdentifer)),
            ],
          }),
        }),
        d.TsMember.KeyValue({
          key: util.codecPropertyName,
          value: codecExprDefinition(typePart, typePartMap),
        }),
      ]);
    }
    case "Kernel":
      return d.TsExpr.ObjectLiteral([
        typePartIdMember(typePart.id),
        d.TsMember.KeyValue({
          key: util.codecPropertyName,
          value: codecExprDefinition(typePart, typePartMap),
        }),

        ...(typePart.body.typePartBodyKernel === d.TypePartBodyKernel.Id ||
        typePart.body.typePartBodyKernel === d.TypePartBodyKernel.Token
          ? [
              d.TsMember.KeyValue({
                key: util.fromStringPropertyName,
                value: d.TsExpr.Lambda({
                  typeParameterList: [],
                  parameterList: [
                    {
                      name: jsTs.identiferFromString("str"),
                      type: d.TsType.String,
                    },
                  ],
                  returnType: d.TsType.ScopeInFile(
                    jsTs.identiferFromString(typePart.name)
                  ),
                  statementList: [
                    d.Statement.Return(
                      d.TsExpr.TypeAssertion({
                        expr: d.TsExpr.Variable(
                          jsTs.identiferFromString("str")
                        ),
                        type: d.TsType.ScopeInFile(
                          jsTs.identiferFromString(typePart.name)
                        ),
                      })
                    ),
                  ],
                }),
              }),
            ]
          : []),
      ]);

    case "Sum": {
      return d.TsExpr.ObjectLiteral([
        ...typePartSumTagExpr(typePart, typePart.body.patternList, typePartMap),
        typePartIdMember(typePart.id),
        d.TsMember.KeyValue({
          key: util.codecPropertyName,
          value: codecExprDefinition(typePart, typePartMap),
        }),
      ]);
    }
  }
};

/** カスタム型の式のcodecプロパティの型 */
const typePartToCodecType = (typePart: d.TypePart): d.TsType =>
  codec.codecTypeWithTypeParameter(
    d.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
    typePart.dataTypeParameterList.map((typeParameter) => typeParameter.name)
  );

const codecExprDefinition = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.TsExpr => {
  if (typePart.dataTypeParameterList.length === 0) {
    return codecDefinitionBodyExpr(typePart, typePartMap);
  }
  return d.TsExpr.Lambda({
    typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
      jsTs.identiferFromString(typeParameter.name)
    ),
    parameterList: typePart.dataTypeParameterList.map((typeParameter) => ({
      name: codec.codecParameterName(typeParameter.name),
      type: codec.codecType(
        d.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
      ),
    })),
    returnType: codec.codecType(
      d.TsType.WithTypeParameter({
        type: d.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
        typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
          d.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
        ),
      })
    ),
    statementList: [
      d.Statement.Return(codecDefinitionBodyExpr(typePart, typePartMap)),
    ],
  });
};

const codecDefinitionBodyExpr = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.TsExpr => {
  return d.TsExpr.ObjectLiteral([
    d.TsMember.KeyValue({
      key: util.encodePropertyName,
      value: encodeExprDefinition(typePart, typePartMap),
    }),
    d.TsMember.KeyValue({
      key: util.decodePropertyName,
      value: decodeExprDefinition(typePart, typePartMap),
    }),
  ]);
};

/**
 * Encode Definition
 */
const encodeExprDefinition = (
  typePart: d.TypePart,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>
): d.TsExpr =>
  codec.encodeLambda(
    d.TsType.WithTypeParameter({
      type: d.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
      typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
        d.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
      ),
    }),
    (valueVar): ReadonlyArray<d.Statement> => {
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
  valueVar: d.TsExpr,
  typeAttribute: d.TypeAttribute
): ReadonlyArray<d.Statement> => {
  switch (typeAttribute) {
    case "AsBoolean":
      return [
        d.Statement.Return(
          d.TsExpr.ArrayLiteral([
            {
              expr: d.TsExpr.ConditionalOperator({
                condition: valueVar,
                thenExpr: d.TsExpr.NumberLiteral(1),
                elseExpr: d.TsExpr.NumberLiteral(0),
              }),
              spread: false,
            },
          ])
        ),
      ];
    case "AsUndefined":
      return [d.Statement.Return(d.TsExpr.ArrayLiteral([]))];
    case "AsNumber":
      return int32.encodeDefinitionStatementList(valueVar);
  }
};

const productEncodeDefinitionStatementList = (
  memberList: ReadonlyArray<d.Member>,
  parameter: d.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): ReadonlyArray<d.Statement> => {
  const [firstMember] = memberList;
  if (firstMember === undefined) {
    return [d.Statement.Return(d.TsExpr.ArrayLiteral([]))];
  }
  let e = d.TsExpr.Call({
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
      d.TsExpr.Call({
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
  return [d.Statement.Return(e)];
};

const sumEncodeDefinitionStatementList = (
  patternList: ReadonlyArray<d.Pattern>,
  parameter: d.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): ReadonlyArray<d.Statement> => [
  d.Statement.Switch({
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
  }),
];

const patternToSwitchPattern = (
  patternList: d.Pattern,
  index: number,
  parameter: d.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): d.TsPattern => {
  const returnExpr = ((): d.TsExpr => {
    switch (patternList.parameter._) {
      case "Just":
        return jsTs.callMethod(
          d.TsExpr.ArrayLiteral([
            { expr: d.TsExpr.NumberLiteral(index), spread: false },
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
        return d.TsExpr.ArrayLiteral([
          { expr: d.TsExpr.NumberLiteral(index), spread: false },
        ]);
    }
  })();
  return {
    caseString: patternList.name,
    statementList: [d.Statement.Return(returnExpr)],
  };
};

const kernelEncodeDefinitionStatementList = (
  typePartBodyKernel: d.TypePartBodyKernel,
  valueVar: d.TsExpr,
  typePart: d.TypePart
): ReadonlyArray<d.Statement> => {
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
        throw new Error("List type need one type paramter");
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
): d.TsExpr => {
  return codec.decodeLambda(
    d.TsType.WithTypeParameter({
      type: d.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
      typeParameterList: typePart.dataTypeParameterList.map((typeParameter) =>
        d.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
      ),
    }),
    (parameterIndex, parameterBinary): ReadonlyArray<d.Statement> => {
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
                  patternUse(
                    typePart.name,
                    true,
                    unitPattern.name,
                    d.Maybe.Nothing()
                  ),
                  parameterIndex
                ),
              ];
            }
            if (typePart.attribute.value === "AsNumber") {
              const [unitPattern] = typePart.body.patternList;
              if (unitPattern === undefined) {
                throw new Error("attribute == Just(AsNumber) need 1 pattern !");
              }
              const decodedInt32Identifer =
                jsTs.identiferFromString("decodedInt32");
              return [
                d.Statement.VariableDefinition({
                  isConst: true,
                  name: decodedInt32Identifer,
                  expr: int32.decode(parameterIndex, parameterBinary),
                  type: codec.decodeReturnType(d.TsType.Number),
                }),
                codec.returnStatement(
                  patternUse(
                    typePart.name,
                    true,
                    unitPattern.name,
                    d.Maybe.Just(
                      codec.getResult(d.TsExpr.Variable(decodedInt32Identifer))
                    )
                  ),
                  codec.getNextIndex(d.TsExpr.Variable(decodedInt32Identifer))
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
  parameterIndex: d.TsExpr,
  parameterBinary: d.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): ReadonlyArray<d.Statement> => {
  const resultAndNextIndexNameIdentifer = (member: d.Member): d.TsIdentifier =>
    jsTs.identiferFromString(member.name + "AndNextIndex");

  const memberDecoderCode = memberList.reduce<{
    nextIndexExpr: d.TsExpr;
    statementList: ReadonlyArray<d.Statement>;
  }>(
    (statementAndNextIndexExpr, memberNameAndType) => {
      const resultAndNextIndexName =
        resultAndNextIndexNameIdentifer(memberNameAndType);
      const resultAndNextIndexVar = d.TsExpr.Variable(resultAndNextIndexName);

      return {
        nextIndexExpr: codec.getNextIndex(resultAndNextIndexVar),
        statementList: statementAndNextIndexExpr.statementList.concat(
          d.Statement.VariableDefinition({
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
      d.TsExpr.ObjectLiteral(
        memberList.map(
          (memberNameAndType): d.TsMember =>
            d.TsMember.KeyValue({
              key: memberNameAndType.name,
              value: codec.getResult(
                d.TsExpr.Variable(
                  resultAndNextIndexNameIdentifer(memberNameAndType)
                )
              ),
            })
        )
      ),
      memberDecoderCode.nextIndexExpr
    )
  );
};

const sumDecodeDefinitionStatementList = (
  patternList: ReadonlyArray<d.Pattern>,
  typePartName: string,
  parameterIndex: d.TsExpr,
  parameterBinary: d.TsExpr,
  noTypeParameter: boolean,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): ReadonlyArray<d.Statement> => {
  const patternIndexAndNextIndexName = jsTs.identiferFromString("patternIndex");
  const patternIndexAndNextIndexVar = d.TsExpr.Variable(
    patternIndexAndNextIndexName
  );

  return [
    d.Statement.VariableDefinition({
      isConst: true,
      name: patternIndexAndNextIndexName,
      type: codec.decodeReturnType(d.TsType.Number),
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
    d.Statement.ThrowError(
      d.TsExpr.StringLiteral(
        "存在しないパターンを指定された 型を更新してください"
      )
    ),
  ];
};

const tagPatternCode = (
  typePartName: string,
  pattern: d.Pattern,
  index: number,
  patternIndexAndNextIndexVar: d.TsExpr,
  parameterBinary: d.TsExpr,
  noTypeParameter: boolean,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): d.Statement => {
  switch (pattern.parameter._) {
    case "Just":
      return d.Statement.If({
        condition: jsTs.equal(
          codec.getResult(patternIndexAndNextIndexVar),
          d.TsExpr.NumberLiteral(index)
        ),
        thenStatementList: [
          d.Statement.VariableDefinition({
            isConst: true,
            name: jsTs.identiferFromString("result"),
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
              d.Maybe.Just(
                codec.getResult(
                  d.TsExpr.Variable(jsTs.identiferFromString("result"))
                )
              )
            ),
            codec.getNextIndex(
              d.TsExpr.Variable(jsTs.identiferFromString("result"))
            )
          ),
        ],
      });
    case "Nothing":
      return d.Statement.If({
        condition: jsTs.equal(
          codec.getResult(patternIndexAndNextIndexVar),
          d.TsExpr.NumberLiteral(index)
        ),
        thenStatementList: [
          codec.returnStatement(
            patternUse(
              typePartName,
              noTypeParameter,
              pattern.name,
              d.Maybe.Nothing()
            ),
            codec.getNextIndex(patternIndexAndNextIndexVar)
          ),
        ],
      });
  }
};

const kernelDecodeDefinitionStatementList = (
  typePartBodyKernel: d.TypePartBodyKernel,
  typePart: d.TypePart,
  parameterIndex: d.TsExpr,
  parameterBinary: d.TsExpr
): ReadonlyArray<d.Statement> => {
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
  parameter: d.Maybe<d.TsExpr>
): d.TsExpr => {
  const tagExpr = jsTs.get(
    d.TsExpr.Variable(jsTs.identiferFromString(typePartName)),
    tagName
  );
  switch (parameter._) {
    case "Just":
      return d.TsExpr.Call({
        expr: tagExpr,
        parameterList: [parameter.value],
      });
    case "Nothing":
      if (noTypeParameter) {
        return tagExpr;
      }
      return d.TsExpr.Call({ expr: tagExpr, parameterList: [] });
  }
};

const encodeExprUse = (
  type_: d.Type,
  target: d.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): d.TsExpr =>
  d.TsExpr.Call({
    expr: jsTs.get(
      codecExprUse(type_, typePartMap, scopeTypePartDataTypeParameterList),
      util.encodePropertyName
    ),
    parameterList: [target],
  });

const decodeExprUse = (
  type_: d.Type,
  indexExpr: d.TsExpr,
  binaryExpr: d.TsExpr,
  typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
) =>
  d.TsExpr.Call({
    expr: jsTs.get(
      codecExprUse(type_, typePartMap, scopeTypePartDataTypeParameterList),
      util.decodePropertyName
    ),
    parameterList: [indexExpr, binaryExpr],
  });

const codecExprUse = (
  type: d.Type,
  typePartDataMap: ReadonlyMap<d.TypePartId, d.TypePart>,
  scopeTypePartDataTypeParameterList: ReadonlyArray<d.DataTypeParameter>
): d.TsExpr => {
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
): d.TsExpr => {
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
          d.TsExpr.Variable(jsTs.identiferFromString(typePart.name)),
          util.codecPropertyName
        );
      }
      return d.TsExpr.Call({
        expr: jsTs.get(
          d.TsExpr.Variable(jsTs.identiferFromString(typePart.name)),
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
      return d.TsExpr.Variable(
        codec.codecParameterName(dataTypeParameter.name)
      );
    }
  }
};
