import * as binary from "./kernelType/binary";
import * as codec from "./kernelType/codec";
import * as data from "../data";
import * as dict from "./kernelType/dict";
import * as hexString from "./kernelType/hexString";
import * as int32 from "./kernelType/int32";
import * as kernelString from "./kernelType/string";
import * as list from "./kernelType/list";
import * as util from "./util";
import { jsTs } from "../gen/main";

export const typePartMapToVariable = (
  typePartMap: ReadonlyMap<data.TypePartId, data.TypePart>,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<data.Variable> => {
  return [...typePartMap].map(([typePartId, typePart]) =>
    typePartToVariable(typePartId, typePart, allTypePartIdTypePartNameMap)
  );
};

const typePartToVariable = (
  typePartId: data.TypePartId,
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.Variable => {
  return {
    name: jsTs.identiferFromString(typePart.name),
    document: typePart.description + "\n@typePartId " + (typePartId as string),
    type: typePartToVariableType(typePart, allTypePartIdTypePartNameMap),
    expr: typePartToVariableExpr(
      typePartId,
      typePart,
      allTypePartIdTypePartNameMap
    ),
  };
};

const typePartToVariableType = (
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsType => {
  const codecTsMemberType: data.TsMemberType = {
    name: util.codecPropertyName,
    required: true,
    type: typePartToCodecType(typePart),
    document: "独自のバイナリ形式の変換処理ができるコーデック",
  };
  const typePartIdMemberType: data.TsMemberType = {
    name: util.typePartIdPropertyName,
    required: true,
    type: data.TsType.ScopeInFile(jsTs.identiferFromString("TypePartId")),
    document: "definy.app内 の 型パーツの Id",
  };

  switch (typePart.body._) {
    case "Product": {
      /** ジェネリック付きの型 */
      const type = data.TsType.WithTypeParameter({
        type: data.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
        typeParameterList: typePart.typeParameterList.map((typeParameter) =>
          data.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
        ),
      });
      return data.TsType.Object([
        typePartIdMemberType,
        codecTsMemberType,
        {
          name: util.helperName,
          document: "型を合わせる上で便利なヘルパー関数",
          required: true,
          type: data.TsType.Function({
            typeParameterList: typePart.typeParameterList.map((typeParameter) =>
              jsTs.identiferFromString(typeParameter.name)
            ),
            parameterList: [type],
            return: type,
          }),
        },
      ]);
    }
    case "Kernel":
      return data.TsType.Object([typePartIdMemberType, codecTsMemberType]);
    case "Sum":
      return data.TsType.Object([
        typePartIdMemberType,
        codecTsMemberType,
        ...typePart.body.patternList.map(
          (pattern): data.TsMemberType => ({
            name: pattern.name,
            required: true,
            type: patternToTagType(
              jsTs.identiferFromString(typePart.name),
              typePart.typeParameterList,
              pattern,
              allTypePartIdTypePartNameMap
            ),
            document: pattern.description,
          })
        ),
      ]);
  }
};

const patternToTagType = (
  typeName: data.TsIdentifer,
  typeParameterList: ReadonlyArray<data.TypeParameter>,
  pattern: data.Pattern,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
) => {
  const typeParameterIdentiferList = typeParameterList.map((typeParameter) =>
    jsTs.identiferFromString(typeParameter.name)
  );
  const returnType = data.TsType.WithTypeParameter({
    type: data.TsType.ScopeInFile(typeName),
    typeParameterList: typeParameterIdentiferList.map(
      (typeParameterIdentifer) =>
        data.TsType.ScopeInFile(typeParameterIdentifer)
    ),
  });

  switch (pattern.parameter._) {
    case "Just":
      return data.TsType.Function({
        typeParameterList: typeParameterIdentiferList,
        parameterList: [
          util.typeToTsType(
            pattern.parameter.value,
            allTypePartIdTypePartNameMap
          ),
        ],
        return: returnType,
      });

    case "Nothing":
      if (typeParameterList.length === 0) {
        return returnType;
      }
      return data.TsType.Function({
        typeParameterList: typeParameterIdentiferList,
        parameterList: [],
        return: returnType,
      });
  }
};

const typePartToVariableExpr = (
  typePartId: data.TypePartId,
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsExpr => {
  const typePartIdMember = data.TsMember.KeyValue({
    key: util.typePartIdPropertyName,
    value: data.TsExpr.TypeAssertion(
      data.TypeAssertion.helper({
        expr: data.TsExpr.StringLiteral(typePartId),
        type: data.TsType.ScopeInFile(jsTs.identiferFromString("TypePartId")),
      })
    ),
  });
  switch (typePart.body._) {
    case "Product": {
      const parameterIdentifer = jsTs.identiferFromString(
        util.firstLowerCase(typePart.name)
      );
      /** ジェネリック付きの型 */
      const type = data.TsType.WithTypeParameter({
        type: data.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
        typeParameterList: typePart.typeParameterList.map((typeParameter) =>
          data.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
        ),
      });
      return data.TsExpr.ObjectLiteral([
        typePartIdMember,
        data.TsMember.KeyValue({
          key: util.helperName,
          value: data.TsExpr.Lambda({
            parameterList: [
              {
                name: parameterIdentifer,
                type,
              },
            ],
            typeParameterList: typePart.typeParameterList.map((typeParameter) =>
              jsTs.identiferFromString(typeParameter.name)
            ),
            returnType: type,
            statementList: [
              data.Statement.Return(data.TsExpr.Variable(parameterIdentifer)),
            ],
          }),
        }),
        data.TsMember.KeyValue({
          key: util.codecPropertyName,
          value: codecExprDefinition(typePart, allTypePartIdTypePartNameMap),
        }),
      ]);
    }
    case "Kernel":
      return data.TsExpr.ObjectLiteral([
        typePartIdMember,
        data.TsMember.KeyValue({
          key: util.codecPropertyName,
          value: codecExprDefinition(typePart, allTypePartIdTypePartNameMap),
        }),
      ]);

    case "Sum": {
      const { patternList } = typePart.body;
      return data.TsExpr.ObjectLiteral([
        ...patternList.map((pattern, index) =>
          data.TsMember.KeyValue({
            key: pattern.name,
            value: patternToTagExpr(
              typePart,
              patternList,
              pattern,
              index,
              allTypePartIdTypePartNameMap
            ),
          })
        ),
        typePartIdMember,
        data.TsMember.KeyValue({
          key: util.codecPropertyName,
          value: codecExprDefinition(typePart, allTypePartIdTypePartNameMap),
        }),
      ]);
    }
  }
};

const patternToTagExpr = (
  typePart: data.TypePart,
  patternList: ReadonlyArray<data.Pattern>,
  pattern: data.Pattern,
  patternIndex: number,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsExpr => {
  if (util.isTagTypeAllNoParameter(patternList)) {
    if (typePart.attribute._ === "Just") {
      switch (typePart.attribute.value) {
        case "AsBoolean":
          return data.TsExpr.BooleanLiteral(patternIndex !== 0);
        case "AsUndefined":
          return data.TsExpr.UndefinedLiteral;
      }
    }
    return data.TsExpr.StringLiteral(pattern.name);
  }
  return patternWithParameterToTagExpr(
    typePart,
    pattern,
    allTypePartIdTypePartNameMap
  );
};

const patternWithParameterToTagExpr = (
  typePart: data.TypePart,
  pattern: data.Pattern,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsExpr => {
  const tagMember: data.TsMember = data.TsMember.KeyValue({
    key: "_",
    value: data.TsExpr.StringLiteral(pattern.name),
  });
  const returnType = data.TsType.WithTypeParameter({
    type: data.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
    typeParameterList: typePart.typeParameterList.map((typeParameter) =>
      data.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
    ),
  });

  switch (pattern.parameter._) {
    case "Just": {
      const parameterIdentifer = jsTs.identiferFromString(
        util.typeToMemberOrParameterName(
          pattern.parameter.value,
          allTypePartIdTypePartNameMap
        )
      );
      return data.TsExpr.Lambda({
        typeParameterList: typePart.typeParameterList.map((typeParameter) =>
          jsTs.identiferFromString(typeParameter.name)
        ),
        parameterList: [
          {
            name: parameterIdentifer,
            type: util.typeToTsType(
              pattern.parameter.value,
              allTypePartIdTypePartNameMap
            ),
          },
        ],
        returnType,
        statementList: [
          data.Statement.Return(
            data.TsExpr.ObjectLiteral([
              tagMember,
              data.TsMember.KeyValue({
                key: util.typeToMemberOrParameterName(
                  pattern.parameter.value,
                  allTypePartIdTypePartNameMap
                ),
                value: data.TsExpr.Variable(parameterIdentifer),
              }),
            ])
          ),
        ],
      });
    }

    case "Nothing":
      if (typePart.typeParameterList.length === 0) {
        return data.TsExpr.ObjectLiteral([tagMember]);
      }
      return data.TsExpr.Lambda({
        typeParameterList: typePart.typeParameterList.map((typeParameter) =>
          jsTs.identiferFromString(typeParameter.name)
        ),
        parameterList: [],
        returnType,
        statementList: [
          data.Statement.Return(data.TsExpr.ObjectLiteral([tagMember])),
        ],
      });
  }
};

/** カスタム型の式のcodecプロパティの型 */
const typePartToCodecType = (typePart: data.TypePart): data.TsType =>
  codec.codecTypeWithTypeParameter(
    data.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
    typePart.typeParameterList.map((typeParameter) => typeParameter.name)
  );

const codecExprDefinition = (
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsExpr => {
  if (typePart.typeParameterList.length === 0) {
    return codecDefinitionBodyExpr(typePart, allTypePartIdTypePartNameMap);
  }
  return data.TsExpr.Lambda({
    typeParameterList: typePart.typeParameterList.map((typeParameter) =>
      jsTs.identiferFromString(typeParameter.name)
    ),
    parameterList: typePart.typeParameterList.map((typeParameter) => ({
      name: codec.codecParameterName(typeParameter.name),
      type: codec.codecType(
        data.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
      ),
    })),
    returnType: codec.codecType(
      data.TsType.WithTypeParameter({
        type: data.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
        typeParameterList: typePart.typeParameterList.map((typeParameter) =>
          data.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
        ),
      })
    ),
    statementList: [
      data.Statement.Return(
        codecDefinitionBodyExpr(typePart, allTypePartIdTypePartNameMap)
      ),
    ],
  });
};

const codecDefinitionBodyExpr = (
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsExpr => {
  return data.TsExpr.ObjectLiteral([
    data.TsMember.KeyValue({
      key: util.encodePropertyName,
      value: encodeExprDefinition(typePart, allTypePartIdTypePartNameMap),
    }),
    data.TsMember.KeyValue({
      key: util.decodePropertyName,
      value: decodeExprDefinition(typePart, allTypePartIdTypePartNameMap),
    }),
  ]);
};

/**
 * Encode Definition
 */
const encodeExprDefinition = (
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsExpr =>
  codec.encodeLambda(
    data.TsType.WithTypeParameter({
      type: data.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
      typeParameterList: typePart.typeParameterList.map((typeParameter) =>
        data.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
      ),
    }),
    (valueVar): ReadonlyArray<data.Statement> => {
      switch (typePart.body._) {
        case "Product":
          return productEncodeDefinitionStatementList(
            typePart.body.memberList,
            valueVar,
            allTypePartIdTypePartNameMap
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
            allTypePartIdTypePartNameMap
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
  valueVar: data.TsExpr,
  typeAttribute: data.TypeAttribute
): ReadonlyArray<data.Statement> => {
  switch (typeAttribute) {
    case "AsBoolean":
      return [
        data.Statement.Return(
          data.TsExpr.ArrayLiteral([
            {
              expr: data.TsExpr.ConditionalOperator({
                condition: valueVar,
                thenExpr: data.TsExpr.NumberLiteral(1),
                elseExpr: data.TsExpr.NumberLiteral(0),
              }),
              spread: false,
            },
          ])
        ),
      ];
    case "AsUndefined":
      return [data.Statement.Return(data.TsExpr.ArrayLiteral([]))];
  }
};

const productEncodeDefinitionStatementList = (
  memberList: ReadonlyArray<data.Member>,
  parameter: data.TsExpr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<data.Statement> => {
  const [firstMember] = memberList;
  if (firstMember === undefined) {
    return [data.Statement.Return(data.TsExpr.ArrayLiteral([]))];
  }
  let e = data.TsExpr.Call({
    expr: jsTs.get(
      codecExprUse(firstMember.type, allTypePartIdTypePartNameMap),
      util.encodePropertyName
    ),
    parameterList: [jsTs.get(parameter, firstMember.name)],
  });
  for (const member of memberList.slice(1)) {
    e = jsTs.callMethod(e, "concat", [
      data.TsExpr.Call({
        expr: jsTs.get(
          codecExprUse(member.type, allTypePartIdTypePartNameMap),
          util.encodePropertyName
        ),
        parameterList: [jsTs.get(parameter, member.name)],
      }),
    ]);
  }
  return [data.Statement.Return(e)];
};

const sumEncodeDefinitionStatementList = (
  patternList: ReadonlyArray<data.Pattern>,
  parameter: data.TsExpr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<data.Statement> => [
  data.Statement.Switch({
    expr: util.isTagTypeAllNoParameter(patternList)
      ? parameter
      : jsTs.get(parameter, "_"),
    patternList: patternList.map((pattern, index) =>
      patternToSwitchPattern(
        pattern,
        index,
        parameter,
        allTypePartIdTypePartNameMap
      )
    ),
  }),
];

const patternToSwitchPattern = (
  patternList: data.Pattern,
  index: number,
  parameter: data.TsExpr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsPattern => {
  const returnExpr = ((): data.TsExpr => {
    switch (patternList.parameter._) {
      case "Just":
        return jsTs.callMethod(
          data.TsExpr.ArrayLiteral([
            { expr: data.TsExpr.NumberLiteral(index), spread: false },
          ]),
          "concat",
          [
            encodeExprUse(
              patternList.parameter.value,
              jsTs.get(
                parameter,
                util.typeToMemberOrParameterName(
                  patternList.parameter.value,
                  allTypePartIdTypePartNameMap
                )
              ),
              allTypePartIdTypePartNameMap
            ),
          ]
        );

      case "Nothing":
        return data.TsExpr.ArrayLiteral([
          { expr: data.TsExpr.NumberLiteral(index), spread: false },
        ]);
    }
  })();
  return {
    caseString: patternList.name,
    statementList: [data.Statement.Return(returnExpr)],
  };
};

const kernelEncodeDefinitionStatementList = (
  typePartBodyKernel: data.TypePartBodyKernel,
  valueVar: data.TsExpr,
  typePart: data.TypePart
): ReadonlyArray<data.Statement> => {
  switch (typePartBodyKernel) {
    case "Function":
      throw new Error("cannot encode function");
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
      const [elementType] = typePart.typeParameterList;
      if (elementType === undefined) {
        throw new Error("List type need one type paramter");
      }
      return list.encodeDefinitionStatementList(elementType.name, valueVar);
    }
    case "Dict": {
      const [key, value] = typePart.typeParameterList;
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
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsExpr => {
  return codec.decodeLambda(
    data.TsType.WithTypeParameter({
      type: data.TsType.ScopeInFile(jsTs.identiferFromString(typePart.name)),
      typeParameterList: typePart.typeParameterList.map((typeParameter) =>
        data.TsType.ScopeInFile(jsTs.identiferFromString(typeParameter.name))
      ),
    }),
    (parameterIndex, parameterBinary): ReadonlyArray<data.Statement> => {
      switch (typePart.body._) {
        case "Product":
          return productDecodeDefinitionStatementList(
            typePart.body.memberList,
            parameterIndex,
            parameterBinary,
            allTypePartIdTypePartNameMap
          );
        case "Sum":
          if (
            typePart.attribute._ === "Just" &&
            typePart.attribute.value === "AsUndefined"
          ) {
            const [unitPattern] = typePart.body.patternList;
            if (unitPattern === undefined) {
              throw new Error("unit do not has pattern !");
            }
            return [
              codec.returnStatement(
                patternUse(
                  typePart.name,
                  true,
                  unitPattern.name,
                  data.Maybe.Nothing()
                ),
                parameterIndex
              ),
            ];
          }
          return sumDecodeDefinitionStatementList(
            typePart.body.patternList,
            typePart.name,
            parameterIndex,
            parameterBinary,
            typePart.typeParameterList.length === 0,
            allTypePartIdTypePartNameMap
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
  memberList: ReadonlyArray<data.Member>,
  parameterIndex: data.TsExpr,
  parameterBinary: data.TsExpr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<data.Statement> => {
  const resultAndNextIndexNameIdentifer = (
    member: data.Member
  ): data.TsIdentifer => jsTs.identiferFromString(member.name + "AndNextIndex");

  const memberDecoderCode = memberList.reduce<{
    nextIndexExpr: data.TsExpr;
    statementList: ReadonlyArray<data.Statement>;
  }>(
    (statementAndNextIndexExpr, memberNameAndType) => {
      const resultAndNextIndexName = resultAndNextIndexNameIdentifer(
        memberNameAndType
      );
      const resultAndNextIndexVar = data.TsExpr.Variable(
        resultAndNextIndexName
      );

      return {
        nextIndexExpr: codec.getNextIndex(resultAndNextIndexVar),
        statementList: statementAndNextIndexExpr.statementList.concat(
          data.Statement.VariableDefinition({
            isConst: true,
            name: resultAndNextIndexName,
            type: codec.decodeReturnType(
              util.typeToTsType(
                memberNameAndType.type,
                allTypePartIdTypePartNameMap
              )
            ),
            expr: decodeExprUse(
              memberNameAndType.type,
              statementAndNextIndexExpr.nextIndexExpr,
              parameterBinary,
              allTypePartIdTypePartNameMap
            ),
          })
        ),
      };
    },
    { nextIndexExpr: parameterIndex, statementList: [] }
  );
  return memberDecoderCode.statementList.concat(
    codec.returnStatement(
      data.TsExpr.ObjectLiteral(
        memberList.map(
          (memberNameAndType): data.TsMember =>
            data.TsMember.KeyValue({
              key: memberNameAndType.name,
              value: codec.getResult(
                data.TsExpr.Variable(
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
  patternList: ReadonlyArray<data.Pattern>,
  typePartName: string,
  parameterIndex: data.TsExpr,
  parameterBinary: data.TsExpr,
  noTypeParameter: boolean,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<data.Statement> => {
  const patternIndexAndNextIndexName = jsTs.identiferFromString("patternIndex");
  const patternIndexAndNextIndexVar = data.TsExpr.Variable(
    patternIndexAndNextIndexName
  );

  return [
    data.Statement.VariableDefinition({
      isConst: true,
      name: patternIndexAndNextIndexName,
      type: codec.decodeReturnType(data.TsType.Number),
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
        allTypePartIdTypePartNameMap
      )
    ),
    data.Statement.ThrowError(
      data.TsExpr.StringLiteral(
        "存在しないパターンを指定された 型を更新してください"
      )
    ),
  ];
};

const tagPatternCode = (
  typePartName: string,
  pattern: data.Pattern,
  index: number,
  patternIndexAndNextIndexVar: data.TsExpr,
  parameterBinary: data.TsExpr,
  noTypeParameter: boolean,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.Statement => {
  switch (pattern.parameter._) {
    case "Just":
      return data.Statement.If({
        condition: jsTs.equal(
          codec.getResult(patternIndexAndNextIndexVar),
          data.TsExpr.NumberLiteral(index)
        ),
        thenStatementList: [
          data.Statement.VariableDefinition({
            isConst: true,
            name: jsTs.identiferFromString("result"),
            type: codec.decodeReturnType(
              util.typeToTsType(
                pattern.parameter.value,
                allTypePartIdTypePartNameMap
              )
            ),
            expr: decodeExprUse(
              pattern.parameter.value,
              codec.getNextIndex(patternIndexAndNextIndexVar),
              parameterBinary,
              allTypePartIdTypePartNameMap
            ),
          }),
          codec.returnStatement(
            patternUse(
              typePartName,
              noTypeParameter,
              pattern.name,
              data.Maybe.Just(
                codec.getResult(
                  data.TsExpr.Variable(jsTs.identiferFromString("result"))
                )
              )
            ),
            codec.getNextIndex(
              data.TsExpr.Variable(jsTs.identiferFromString("result"))
            )
          ),
        ],
      });
    case "Nothing":
      return data.Statement.If({
        condition: jsTs.equal(
          codec.getResult(patternIndexAndNextIndexVar),
          data.TsExpr.NumberLiteral(index)
        ),
        thenStatementList: [
          codec.returnStatement(
            patternUse(
              typePartName,
              noTypeParameter,
              pattern.name,
              data.Maybe.Nothing()
            ),
            codec.getNextIndex(patternIndexAndNextIndexVar)
          ),
        ],
      });
  }
};

const kernelDecodeDefinitionStatementList = (
  typePartBodyKernel: data.TypePartBodyKernel,
  typePart: data.TypePart,
  parameterIndex: data.TsExpr,
  parameterBinary: data.TsExpr
): ReadonlyArray<data.Statement> => {
  switch (typePartBodyKernel) {
    case "Function":
      throw new Error("cannot decode function");
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
      const [elementType] = typePart.typeParameterList;
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
      const [key, value] = typePart.typeParameterList;
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
  parameter: data.Maybe<data.TsExpr>
): data.TsExpr => {
  const tagExpr = jsTs.get(
    data.TsExpr.Variable(jsTs.identiferFromString(typePartName)),
    tagName
  );
  switch (parameter._) {
    case "Just":
      return data.TsExpr.Call({
        expr: tagExpr,
        parameterList: [parameter.value],
      });
    case "Nothing":
      if (noTypeParameter) {
        return tagExpr;
      }
      return data.TsExpr.Call({ expr: tagExpr, parameterList: [] });
  }
};

const encodeExprUse = (
  type_: data.Type,
  target: data.TsExpr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsExpr =>
  data.TsExpr.Call({
    expr: jsTs.get(
      codecExprUse(type_, allTypePartIdTypePartNameMap),
      util.encodePropertyName
    ),
    parameterList: [target],
  });

const decodeExprUse = (
  type_: data.Type,
  indexExpr: data.TsExpr,
  binaryExpr: data.TsExpr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
) =>
  data.TsExpr.Call({
    expr: jsTs.get(
      codecExprUse(type_, allTypePartIdTypePartNameMap),
      util.decodePropertyName
    ),
    parameterList: [indexExpr, binaryExpr],
  });

const codecExprUse = (
  type: data.Type,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): data.TsExpr => {
  const typePartName = allTypePartIdTypePartNameMap.get(type.typePartId);
  if (typePartName === undefined) {
    throw new Error(
      "internal error not found type part name in codecExprUse. typePartId =" +
        (type.typePartId as string)
    );
  }
  if (type.parameter.length === 0) {
    return typePartNameToCodecExpr(typePartName);
  }
  return data.TsExpr.Call({
    expr: typePartNameToCodecExpr(typePartName),
    parameterList: type.parameter.map((parameter) =>
      codecExprUse(parameter, allTypePartIdTypePartNameMap)
    ),
  });
};

const typePartNameToCodecExpr = (typePartName: string): data.TsExpr => {
  // TODO 型パラメーターかどうかの判定を名前でしてしまっている
  if (util.isFirstLowerCaseName(typePartName)) {
    return data.TsExpr.Variable(codec.codecParameterName(typePartName));
  }
  return jsTs.get(
    data.TsExpr.Variable(jsTs.identiferFromString(typePartName)),
    util.codecPropertyName
  );
};
