import * as codec from "./codec";
import * as ts from "../../data";
import { identifer, util as tsUtil } from "../../gen/jsTs/main";

const encodeDefinition = (
  byteSize: number,
  functionName: ts.TsIdentifer,
  document: string
): ts.Function => {
  const valueName = identifer.fromString("value");
  const valueVar = ts.TsExpr.Variable(valueName);
  const iName = identifer.fromString("i");
  const iVar = ts.TsExpr.Variable(iName);

  return {
    name: functionName,
    document,
    typeParameterList: [],
    returnType: codec.encodeReturnType,
    parameterList: [
      {
        name: valueName,
        document: "",
        type: ts.TsType.String,
      },
    ],
    statementList: [
      ts.Statement.Return(
        tsUtil.callMethod(
          ts.TsExpr.GlobalObjects(identifer.fromString("Array")),
          "from",
          [
            ts.TsExpr.ObjectLiteral([
              ts.TsMember.KeyValue({
                key: "length",
                value: ts.TsExpr.NumberLiteral(byteSize),
              }),
            ]),
            ts.TsExpr.Lambda({
              typeParameterList: [],
              parameterList: [
                {
                  name: identifer.fromString("_"),
                  type: ts.TsType.Undefined,
                },
                {
                  name: iName,
                  type: ts.TsType.Number,
                },
              ],
              returnType: ts.TsType.Number,
              statementList: [
                ts.Statement.Return(
                  tsUtil.callNumberMethod("parseInt", [
                    tsUtil.callMethod(valueVar, "slice", [
                      tsUtil.multiplication(iVar, ts.TsExpr.NumberLiteral(2)),
                      tsUtil.addition(
                        tsUtil.multiplication(iVar, ts.TsExpr.NumberLiteral(2)),
                        ts.TsExpr.NumberLiteral(2)
                      ),
                    ]),
                    ts.TsExpr.NumberLiteral(16),
                  ])
                ),
              ],
            }),
          ]
        )
      ),
    ],
  };
};

const decodeDefinition = (
  byteSize: number,
  functionName: ts.TsIdentifer,
  document: string
): ts.Function => {
  const parameterIndex = ts.TsExpr.Variable(codec.indexIdentifer);
  const parameterBinary = ts.TsExpr.Variable(codec.binaryIdentifer);
  return {
    name: functionName,
    document,
    typeParameterList: [],
    returnType: codec.decodeReturnType(ts.TsType.String),
    parameterList: codec.decodeParameterList,
    statementList: [
      codec.returnStatement(
        tsUtil.callMethod(
          tsUtil.callMethod(
            ts.TsExpr.ArrayLiteral([
              {
                expr: tsUtil.callMethod(parameterBinary, "slice", [
                  parameterIndex,
                  tsUtil.addition(
                    parameterIndex,
                    ts.TsExpr.NumberLiteral(byteSize)
                  ),
                ]),
                spread: true,
              },
            ]),
            "map",
            [
              ts.TsExpr.Lambda({
                typeParameterList: [],
                parameterList: [
                  {
                    name: identifer.fromString("n"),
                    type: ts.TsType.Number,
                  },
                ],
                returnType: ts.TsType.String,
                statementList: [
                  ts.Statement.Return(
                    tsUtil.callMethod(
                      tsUtil.callMethod(
                        ts.TsExpr.Variable(identifer.fromString("n")),
                        "toString",
                        [ts.TsExpr.NumberLiteral(16)]
                      ),
                      "padStart",
                      [ts.TsExpr.NumberLiteral(2), ts.TsExpr.StringLiteral("0")]
                    )
                  ),
                ],
              }),
            ]
          ),
          "join",
          [ts.TsExpr.StringLiteral("")]
        ),

        tsUtil.addition(parameterIndex, ts.TsExpr.NumberLiteral(byteSize))
      ),
    ],
  };
};

const idByteSize = 16;
const tokenByteSize = 32;

const encodeIdIdentifer = identifer.fromString("encodeId");
const encodeIdVariable = ts.TsExpr.Variable(encodeIdIdentifer);
export const encodeIdFunction: ts.Function = encodeDefinition(
  idByteSize,
  encodeIdIdentifer,
  "UserId, ProjectIdなどのIdをバイナリ形式にエンコードする"
);

const encodeTokenIdentifer = identifer.fromString("encodeToken");
const encodeTokenVariable = ts.TsExpr.Variable(encodeTokenIdentifer);
export const tokenEncodeFunction: ts.Function = encodeDefinition(
  tokenByteSize,
  encodeTokenIdentifer,
  "ImageTokenなどのTokenをバイナリ形式にエンコードする"
);

const decodeIdIdentifer = identifer.fromString("decodeId");
const decodeIdVariable = ts.TsExpr.Variable(decodeIdIdentifer);
export const idDecodeFunction: ts.Function = decodeDefinition(
  idByteSize,
  decodeIdIdentifer,
  "バイナリ形式をUserId, ProjectIdなどのIdにデコードする"
);

const decodeTokenIdentifer = identifer.fromString("decodeToken");
const decodeTokenVariable = ts.TsExpr.Variable(decodeTokenIdentifer);
export const decodeTokenFunction: ts.Function = decodeDefinition(
  tokenByteSize,
  decodeTokenIdentifer,
  "バイナリ形式をImageTokenなどのTokenにエンコードする"
);

export const idEncodeDefinitionStatementList = (
  valueVar: ts.TsExpr
): ReadonlyArray<ts.Statement> => [
  ts.Statement.Return(
    ts.TsExpr.Call({
      expr: encodeIdVariable,
      parameterList: [valueVar],
    })
  ),
];

export const idDecodeDefinitionStatementList = (
  typePartName: string,
  parameterIndex: ts.TsExpr,
  parameterBinary: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const targetType = ts.TsType.ScopeInFile(identifer.fromString(typePartName));
  return [
    ts.Statement.Return(
      ts.TsExpr.TypeAssertion({
        expr: ts.TsExpr.Call({
          expr: decodeIdVariable,
          parameterList: [parameterIndex, parameterBinary],
        }),
        type: codec.decodeReturnType(targetType),
      })
    ),
  ];
};

export const tokenEncodeDefinitionStatementList = (
  valueVar: ts.TsExpr
): ReadonlyArray<ts.Statement> => [
  ts.Statement.Return(
    ts.TsExpr.Call({
      expr: encodeTokenVariable,
      parameterList: [valueVar],
    })
  ),
];

export const tokenDecodeDefinitionStatementList = (
  typePartName: string,
  parameterIndex: ts.TsExpr,
  parameterBinary: ts.TsExpr
): ReadonlyArray<ts.Statement> => {
  const targetType = ts.TsType.ScopeInFile(identifer.fromString(typePartName));
  return [
    ts.Statement.Return(
      ts.TsExpr.TypeAssertion({
        expr: ts.TsExpr.Call({
          expr: decodeTokenVariable,
          parameterList: [parameterIndex, parameterBinary],
        }),
        type: codec.decodeReturnType(targetType),
      })
    ),
  ];
};
