import * as codec from "./codec";
import * as ts from "../../localData";
import { jsTs } from "../../gen/main";

const encodeDefinition = (
  byteSize: number,
  functionName: ts.TsIdentifier,
  document: string
): ts.Function => {
  const valueName = jsTs.identifierFromString("value");
  const valueVar = ts.TsExpr.Variable(valueName);
  const iName = jsTs.identifierFromString("i");
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
        jsTs.callMethod(
          ts.TsExpr.GlobalObjects(jsTs.identifierFromString("Array")),
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
                  name: jsTs.identifierFromString("_"),
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
                  jsTs.callNumberMethod("parseInt", [
                    jsTs.callMethod(valueVar, "slice", [
                      jsTs.multiplication(iVar, ts.TsExpr.NumberLiteral(2)),
                      jsTs.addition(
                        jsTs.multiplication(iVar, ts.TsExpr.NumberLiteral(2)),
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
  functionName: ts.TsIdentifier,
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
        jsTs.callMethod(
          jsTs.callMethod(
            ts.TsExpr.ArrayLiteral([
              {
                expr: jsTs.callMethod(parameterBinary, "slice", [
                  parameterIndex,
                  jsTs.addition(
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
                    name: jsTs.identifierFromString("n"),
                    type: ts.TsType.Number,
                  },
                ],
                returnType: ts.TsType.String,
                statementList: [
                  ts.Statement.Return(
                    jsTs.callMethod(
                      jsTs.callMethod(
                        ts.TsExpr.Variable(jsTs.identifierFromString("n")),
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

        jsTs.addition(parameterIndex, ts.TsExpr.NumberLiteral(byteSize))
      ),
    ],
  };
};

const idByteSize = 16;
const tokenByteSize = 32;

const encodeIdIdentifer = jsTs.identifierFromString("encodeId");
const encodeIdVariable = ts.TsExpr.Variable(encodeIdIdentifer);
export const encodeIdFunction: ts.Function = encodeDefinition(
  idByteSize,
  encodeIdIdentifer,
  "UserId, ProjectIdなどのIdをバイナリ形式にエンコードする"
);

const encodeTokenIdentifer = jsTs.identifierFromString("encodeToken");
const encodeTokenVariable = ts.TsExpr.Variable(encodeTokenIdentifer);
export const tokenEncodeFunction: ts.Function = encodeDefinition(
  tokenByteSize,
  encodeTokenIdentifer,
  "ImageTokenなどのTokenをバイナリ形式にエンコードする"
);

const decodeIdIdentifer = jsTs.identifierFromString("decodeId");
const decodeIdVariable = ts.TsExpr.Variable(decodeIdIdentifer);
export const idDecodeFunction: ts.Function = decodeDefinition(
  idByteSize,
  decodeIdIdentifer,
  "バイナリ形式をUserId, ProjectIdなどのIdにデコードする"
);

const decodeTokenIdentifer = jsTs.identifierFromString("decodeToken");
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
  const targetType = ts.TsType.ScopeInFile(
    jsTs.identifierFromString(typePartName)
  );
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
  const targetType = ts.TsType.ScopeInFile(
    jsTs.identifierFromString(typePartName)
  );
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
