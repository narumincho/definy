import * as binary from "./kernelType/binary";
import * as codec from "./kernelType/codec";
import * as data from "./data";
import * as dict from "./kernelType/dict";
import * as hexString from "./kernelType/hexString";
import * as identifer from "js-ts-code-generator/identifer";
import * as int32 from "./kernelType/int32";
import * as kernelString from "./kernelType/string";
import * as list from "./kernelType/list";
import * as ts from "js-ts-code-generator/data";
import * as tsUtil from "js-ts-code-generator/util";
import * as util from "./util";

export const typePartMapToVariable = (
  typePartMap: ReadonlyMap<data.TypePartId, data.TypePart>,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<ts.Variable> => {
  return [...typePartMap].map(([typePartId, typePart]) =>
    typePartToVariable(typePartId, typePart, allTypePartIdTypePartNameMap)
  );
};

const typePartToVariable = (
  typePartId: data.TypePartId,
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ts.Variable => {
  return {
    name: identifer.fromString(typePart.name),
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
): ts.Type => {
  const codecTsMemberType: ts.MemberType = {
    name: util.codecPropertyName,
    required: true,
    type: typePartToCodecType(typePart),
    document: "独自のバイナリ形式の変換処理ができるコーデック",
  };
  const typePartIdMemberType: ts.MemberType = {
    name: util.typePartIdPropertyName,
    required: true,
    type: ts.Type.ScopeInFile(identifer.fromString("TypePartId")),
    document: "definy.app内 の 型パーツの Id",
  };

  switch (typePart.body._) {
    case "Product": {
      /** ジェネリック付きの型 */
      const type = ts.Type.WithTypeParameter({
        type: ts.Type.ScopeInFile(identifer.fromString(typePart.name)),
        typeParameterList: typePart.typeParameterList.map((typeParameter) =>
          ts.Type.ScopeInFile(identifer.fromString(typeParameter.name))
        ),
      });
      return ts.Type.Object([
        typePartIdMemberType,
        codecTsMemberType,
        {
          name: util.helperName,
          document: "型を合わせる上で便利なヘルパー関数",
          required: true,
          type: ts.Type.Function({
            typeParameterList: typePart.typeParameterList.map((typeParameter) =>
              identifer.fromString(typeParameter.name)
            ),
            parameterList: [type],
            return: type,
          }),
        },
      ]);
    }
    case "Kernel":
      return ts.Type.Object([typePartIdMemberType, codecTsMemberType]);
    case "Sum":
      return ts.Type.Object([
        typePartIdMemberType,
        codecTsMemberType,
        ...typePart.body.patternList.map(
          (pattern): ts.MemberType => ({
            name: pattern.name,
            required: true,
            type: patternToTagType(
              identifer.fromString(typePart.name),
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
  typeName: ts.Identifer,
  typeParameterList: ReadonlyArray<data.TypeParameter>,
  pattern: data.Pattern,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
) => {
  const typeParameterIdentiferList = typeParameterList.map((typeParameter) =>
    identifer.fromString(typeParameter.name)
  );
  const returnType = ts.Type.WithTypeParameter({
    type: ts.Type.ScopeInFile(typeName),
    typeParameterList: typeParameterIdentiferList.map(
      (typeParameterIdentifer) => ts.Type.ScopeInFile(typeParameterIdentifer)
    ),
  });

  switch (pattern.parameter._) {
    case "Just":
      return ts.Type.Function({
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
      return ts.Type.Function({
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
): ts.Expr => {
  const typePartIdMember = ts.Member.KeyValue({
    key: util.typePartIdPropertyName,
    value: ts.Expr.TypeAssertion(
      ts.TypeAssertion.helper({
        expr: ts.Expr.StringLiteral(typePartId),
        type: ts.Type.ScopeInFile(identifer.fromString("TypePartId")),
      })
    ),
  });
  switch (typePart.body._) {
    case "Product": {
      const parameterIdentifer = identifer.fromString(
        util.firstLowerCase(typePart.name)
      );
      /** ジェネリック付きの型 */
      const type = ts.Type.WithTypeParameter({
        type: ts.Type.ScopeInFile(identifer.fromString(typePart.name)),
        typeParameterList: typePart.typeParameterList.map((typeParameter) =>
          ts.Type.ScopeInFile(identifer.fromString(typeParameter.name))
        ),
      });
      return ts.Expr.ObjectLiteral([
        typePartIdMember,
        ts.Member.KeyValue({
          key: util.helperName,
          value: ts.Expr.Lambda({
            parameterList: [
              {
                name: parameterIdentifer,
                type,
              },
            ],
            typeParameterList: typePart.typeParameterList.map((typeParameter) =>
              identifer.fromString(typeParameter.name)
            ),
            returnType: type,
            statementList: [
              ts.Statement.Return(ts.Expr.Variable(parameterIdentifer)),
            ],
          }),
        }),
        ts.Member.KeyValue({
          key: util.codecPropertyName,
          value: codecExprDefinition(typePart, allTypePartIdTypePartNameMap),
        }),
      ]);
    }
    case "Kernel":
      return ts.Expr.ObjectLiteral([
        typePartIdMember,
        ts.Member.KeyValue({
          key: util.codecPropertyName,
          value: codecExprDefinition(typePart, allTypePartIdTypePartNameMap),
        }),
      ]);

    case "Sum": {
      const { patternList } = typePart.body;
      return ts.Expr.ObjectLiteral([
        ...patternList.map((pattern, index) =>
          ts.Member.KeyValue({
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
        ts.Member.KeyValue({
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
) => {
  if (util.isTagTypeAllNoParameter(patternList)) {
    if (typePart.attribute._ === "Just") {
      switch (typePart.attribute.value) {
        case "AsBoolean":
          return ts.Expr.BooleanLiteral(patternIndex !== 0);
        case "AsUndefined":
          return ts.Expr.UndefinedLiteral;
      }
    }
    return ts.Expr.StringLiteral(pattern.name);
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
): ts.Expr => {
  const tagMember: ts.Member = ts.Member.KeyValue({
    key: "_",
    value: ts.Expr.StringLiteral(pattern.name),
  });
  const returnType = ts.Type.WithTypeParameter({
    type: ts.Type.ScopeInFile(identifer.fromString(typePart.name)),
    typeParameterList: typePart.typeParameterList.map((typeParameter) =>
      ts.Type.ScopeInFile(identifer.fromString(typeParameter.name))
    ),
  });

  switch (pattern.parameter._) {
    case "Just": {
      const parameterIdentifer = identifer.fromString(
        util.typeToMemberOrParameterName(
          pattern.parameter.value,
          allTypePartIdTypePartNameMap
        )
      );
      return ts.Expr.Lambda({
        typeParameterList: typePart.typeParameterList.map((typeParameter) =>
          identifer.fromString(typeParameter.name)
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
          ts.Statement.Return(
            ts.Expr.ObjectLiteral([
              tagMember,
              ts.Member.KeyValue({
                key: util.typeToMemberOrParameterName(
                  pattern.parameter.value,
                  allTypePartIdTypePartNameMap
                ),
                value: ts.Expr.Variable(parameterIdentifer),
              }),
            ])
          ),
        ],
      });
    }

    case "Nothing":
      if (typePart.typeParameterList.length === 0) {
        return ts.Expr.ObjectLiteral([tagMember]);
      }
      return ts.Expr.Lambda({
        typeParameterList: typePart.typeParameterList.map((typeParameter) =>
          identifer.fromString(typeParameter.name)
        ),
        parameterList: [],
        returnType,
        statementList: [
          ts.Statement.Return(ts.Expr.ObjectLiteral([tagMember])),
        ],
      });
  }
};

/** カスタム型の式のcodecプロパティの型 */
const typePartToCodecType = (typePart: data.TypePart): ts.Type =>
  codec.codecTypeWithTypeParameter(
    ts.Type.ScopeInFile(identifer.fromString(typePart.name)),
    typePart.typeParameterList.map((typeParameter) => typeParameter.name)
  );

const codecExprDefinition = (
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ts.Expr => {
  if (typePart.typeParameterList.length === 0) {
    return codecDefinitionBodyExpr(typePart, allTypePartIdTypePartNameMap);
  }
  return ts.Expr.Lambda({
    typeParameterList: typePart.typeParameterList.map((typeParameter) =>
      identifer.fromString(typeParameter.name)
    ),
    parameterList: typePart.typeParameterList.map((typeParameter) => ({
      name: codec.codecParameterName(typeParameter.name),
      type: codec.codecType(
        ts.Type.ScopeInFile(identifer.fromString(typeParameter.name))
      ),
    })),
    returnType: codec.codecType(
      ts.Type.WithTypeParameter({
        type: ts.Type.ScopeInFile(identifer.fromString(typePart.name)),
        typeParameterList: typePart.typeParameterList.map((typeParameter) =>
          ts.Type.ScopeInFile(identifer.fromString(typeParameter.name))
        ),
      })
    ),
    statementList: [
      ts.Statement.Return(
        codecDefinitionBodyExpr(typePart, allTypePartIdTypePartNameMap)
      ),
    ],
  });
};

const codecDefinitionBodyExpr = (
  typePart: data.TypePart,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ts.Expr => {
  return ts.Expr.ObjectLiteral([
    ts.Member.KeyValue({
      key: util.encodePropertyName,
      value: encodeExprDefinition(typePart, allTypePartIdTypePartNameMap),
    }),
    ts.Member.KeyValue({
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
): ts.Expr =>
  codec.encodeLambda(
    ts.Type.WithTypeParameter({
      type: ts.Type.ScopeInFile(identifer.fromString(typePart.name)),
      typeParameterList: typePart.typeParameterList.map((typeParameter) =>
        ts.Type.ScopeInFile(identifer.fromString(typeParameter.name))
      ),
    }),
    (valueVar): ReadonlyArray<ts.Statement> => {
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
  valueVar: ts.Expr,
  typeAttribute: data.TypeAttribute
): ReadonlyArray<ts.Statement> => {
  switch (typeAttribute) {
    case "AsBoolean":
      return [
        ts.Statement.Return(
          ts.Expr.ArrayLiteral([
            {
              expr: ts.Expr.ConditionalOperator({
                condition: valueVar,
                thenExpr: ts.Expr.NumberLiteral(1),
                elseExpr: ts.Expr.NumberLiteral(0),
              }),
              spread: false,
            },
          ])
        ),
      ];
    case "AsUndefined":
      return [ts.Statement.Return(ts.Expr.ArrayLiteral([]))];
  }
};

const productEncodeDefinitionStatementList = (
  memberList: ReadonlyArray<data.Member>,
  parameter: ts.Expr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<ts.Statement> => {
  const [firstMember] = memberList;
  if (firstMember === undefined) {
    return [ts.Statement.Return(ts.Expr.ArrayLiteral([]))];
  }
  let e = ts.Expr.Call({
    expr: tsUtil.get(
      codecExprUse(firstMember.type, allTypePartIdTypePartNameMap),
      util.encodePropertyName
    ),
    parameterList: [tsUtil.get(parameter, firstMember.name)],
  });
  for (const member of memberList.slice(1)) {
    e = tsUtil.callMethod(e, "concat", [
      ts.Expr.Call({
        expr: tsUtil.get(
          codecExprUse(member.type, allTypePartIdTypePartNameMap),
          util.encodePropertyName
        ),
        parameterList: [tsUtil.get(parameter, member.name)],
      }),
    ]);
  }
  return [ts.Statement.Return(e)];
};

const sumEncodeDefinitionStatementList = (
  patternList: ReadonlyArray<data.Pattern>,
  parameter: ts.Expr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<ts.Statement> => [
  ts.Statement.Switch({
    expr: util.isTagTypeAllNoParameter(patternList)
      ? parameter
      : tsUtil.get(parameter, "_"),
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
  parameter: ts.Expr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ts.Pattern => {
  const returnExpr = ((): ts.Expr => {
    switch (patternList.parameter._) {
      case "Just":
        return tsUtil.callMethod(
          ts.Expr.ArrayLiteral([
            { expr: ts.Expr.NumberLiteral(index), spread: false },
          ]),
          "concat",
          [
            encodeExprUse(
              patternList.parameter.value,
              tsUtil.get(
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
        return ts.Expr.ArrayLiteral([
          { expr: ts.Expr.NumberLiteral(index), spread: false },
        ]);
    }
  })();
  return {
    caseString: patternList.name,
    statementList: [ts.Statement.Return(returnExpr)],
  };
};

const kernelEncodeDefinitionStatementList = (
  typePartBodyKernel: data.TypePartBodyKernel,
  valueVar: ts.Expr,
  typePart: data.TypePart
): ReadonlyArray<ts.Statement> => {
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
): ts.Expr => {
  return codec.decodeLambda(
    ts.Type.WithTypeParameter({
      type: ts.Type.ScopeInFile(identifer.fromString(typePart.name)),
      typeParameterList: typePart.typeParameterList.map((typeParameter) =>
        ts.Type.ScopeInFile(identifer.fromString(typeParameter.name))
      ),
    }),
    (parameterIndex, parameterBinary): ReadonlyArray<ts.Statement> => {
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
  parameterIndex: ts.Expr,
  parameterBinary: ts.Expr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<ts.Statement> => {
  const resultAndNextIndexNameIdentifer = (member: data.Member): ts.Identifer =>
    identifer.fromString(member.name + "AndNextIndex");

  const memberDecoderCode = memberList.reduce<{
    nextIndexExpr: ts.Expr;
    statementList: ReadonlyArray<ts.Statement>;
  }>(
    (statementAndNextIndexExpr, memberNameAndType) => {
      const resultAndNextIndexName = resultAndNextIndexNameIdentifer(
        memberNameAndType
      );
      const resultAndNextIndexVar = ts.Expr.Variable(resultAndNextIndexName);

      return {
        nextIndexExpr: codec.getNextIndex(resultAndNextIndexVar),
        statementList: statementAndNextIndexExpr.statementList.concat(
          ts.Statement.VariableDefinition({
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
      ts.Expr.ObjectLiteral(
        memberList.map(
          (memberNameAndType): ts.Member =>
            ts.Member.KeyValue({
              key: memberNameAndType.name,
              value: codec.getResult(
                ts.Expr.Variable(
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
  parameterIndex: ts.Expr,
  parameterBinary: ts.Expr,
  noTypeParameter: boolean,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ReadonlyArray<ts.Statement> => {
  const patternIndexAndNextIndexName = identifer.fromString("patternIndex");
  const patternIndexAndNextIndexVar = ts.Expr.Variable(
    patternIndexAndNextIndexName
  );

  return [
    ts.Statement.VariableDefinition({
      isConst: true,
      name: patternIndexAndNextIndexName,
      type: codec.decodeReturnType(ts.Type.Number),
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
    ts.Statement.ThrowError(
      ts.Expr.StringLiteral(
        "存在しないパターンを指定された 型を更新してください"
      )
    ),
  ];
};

const tagPatternCode = (
  typePartName: string,
  pattern: data.Pattern,
  index: number,
  patternIndexAndNextIndexVar: ts.Expr,
  parameterBinary: ts.Expr,
  noTypeParameter: boolean,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ts.Statement => {
  switch (pattern.parameter._) {
    case "Just":
      return ts.Statement.If({
        condition: tsUtil.equal(
          codec.getResult(patternIndexAndNextIndexVar),
          ts.Expr.NumberLiteral(index)
        ),
        thenStatementList: [
          ts.Statement.VariableDefinition({
            isConst: true,
            name: identifer.fromString("result"),
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
                  ts.Expr.Variable(identifer.fromString("result"))
                )
              )
            ),
            codec.getNextIndex(ts.Expr.Variable(identifer.fromString("result")))
          ),
        ],
      });
    case "Nothing":
      return ts.Statement.If({
        condition: tsUtil.equal(
          codec.getResult(patternIndexAndNextIndexVar),
          ts.Expr.NumberLiteral(index)
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
  parameterIndex: ts.Expr,
  parameterBinary: ts.Expr
): ReadonlyArray<ts.Statement> => {
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
  parameter: data.Maybe<ts.Expr>
): ts.Expr => {
  const tagExpr = tsUtil.get(
    ts.Expr.Variable(identifer.fromString(typePartName)),
    tagName
  );
  switch (parameter._) {
    case "Just":
      return ts.Expr.Call({ expr: tagExpr, parameterList: [parameter.value] });
    case "Nothing":
      if (noTypeParameter) {
        return tagExpr;
      }
      return ts.Expr.Call({ expr: tagExpr, parameterList: [] });
  }
};

const encodeExprUse = (
  type_: data.Type,
  target: ts.Expr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ts.Expr =>
  ts.Expr.Call({
    expr: tsUtil.get(
      codecExprUse(type_, allTypePartIdTypePartNameMap),
      util.encodePropertyName
    ),
    parameterList: [target],
  });

const decodeExprUse = (
  type_: data.Type,
  indexExpr: ts.Expr,
  binaryExpr: ts.Expr,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
) =>
  ts.Expr.Call({
    expr: tsUtil.get(
      codecExprUse(type_, allTypePartIdTypePartNameMap),
      util.decodePropertyName
    ),
    parameterList: [indexExpr, binaryExpr],
  });

const codecExprUse = (
  type: data.Type,
  allTypePartIdTypePartNameMap: ReadonlyMap<data.TypePartId, string>
): ts.Expr => {
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
  return ts.Expr.Call({
    expr: typePartNameToCodecExpr(typePartName),
    parameterList: type.parameter.map((parameter) =>
      codecExprUse(parameter, allTypePartIdTypePartNameMap)
    ),
  });
};

const typePartNameToCodecExpr = (typePartName: string): ts.Expr => {
  // TODO 型パラメーターかどうかの判定を名前でしてしまっている
  if (util.isFirstLowerCaseName(typePartName)) {
    return ts.Expr.Variable(codec.codecParameterName(typePartName));
  }
  return tsUtil.get(
    ts.Expr.Variable(identifer.fromString(typePartName)),
    util.codecPropertyName
  );
};
