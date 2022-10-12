import * as codec from "./codec";
import { jsTs } from "../../deno-lib/npm";

const encodeDefinition = (
  byteSize: number,
  functionName: jsTs.TsIdentifier,
  document: string
): jsTs.data.Function => {
  const valueName = jsTs.identifierFromString("value");
  const valueVar: jsTs.data.TsExpr = { _: "Variable", tsIdentifier: valueName };
  const iName = jsTs.identifierFromString("i");
  const iVar: jsTs.data.TsExpr = { _: "Variable", tsIdentifier: iName };

  return {
    name: functionName,
    document,
    typeParameterList: [],
    returnType: codec.encodeReturnType,
    parameterList: [
      {
        name: valueName,
        document: "",
        type: { _: "String" },
      },
    ],
    statementList: [
      {
        _: "Return",
        tsExpr: jsTs.callMethod(
          {
            _: "GlobalObjects",
            tsIdentifier: jsTs.identifierFromString("Array"),
          },
          "from",
          [
            jsTs.objectLiteral([
              jsTs.memberKeyValue("length", {
                _: "NumberLiteral",
                int32: byteSize,
              }),
            ]),
            {
              _: "Lambda",
              lambdaExpr: {
                typeParameterList: [],
                parameterList: [
                  {
                    name: jsTs.identifierFromString("_"),
                    type: { _: "Undefined" },
                  },
                  {
                    name: iName,
                    type: { _: "Number" },
                  },
                ],
                returnType: { _: "Number" },
                statementList: [
                  {
                    _: "Return",
                    tsExpr: jsTs.callNumberMethod("parseInt", [
                      jsTs.callMethod(valueVar, "slice", [
                        jsTs.multiplication(iVar, {
                          _: "NumberLiteral",
                          int32: 2,
                        }),
                        jsTs.addition(
                          jsTs.multiplication(iVar, {
                            _: "NumberLiteral",
                            int32: 2,
                          }),
                          { _: "NumberLiteral", int32: 2 }
                        ),
                      ]),
                      { _: "NumberLiteral", int32: 16 },
                    ]),
                  },
                ],
              },
            },
          ]
        ),
      },
    ],
  };
};

const decodeDefinition = (
  byteSize: number,
  functionName: jsTs.TsIdentifier,
  document: string
): jsTs.data.Function => {
  const parameterIndex: jsTs.data.TsExpr = {
    _: "Variable",
    tsIdentifier: codec.indexIdentifier,
  };
  const parameterBinary: jsTs.data.TsExpr = {
    _: "Variable",
    tsIdentifier: codec.binaryIdentifier,
  };
  return {
    name: functionName,
    document,
    typeParameterList: [],
    returnType: codec.decodeReturnType({ _: "String" }),
    parameterList: codec.decodeParameterList,
    statementList: [
      codec.returnStatement(
        jsTs.callMethod(
          jsTs.callMethod(
            jsTs.arrayLiteral([
              {
                expr: jsTs.callMethod(parameterBinary, "slice", [
                  parameterIndex,
                  jsTs.addition(parameterIndex, jsTs.numberLiteral(byteSize)),
                ]),
                spread: true,
              },
            ]),
            "map",
            [
              {
                _: "Lambda",
                lambdaExpr: {
                  typeParameterList: [],
                  parameterList: [
                    {
                      name: jsTs.identifierFromString("n"),
                      type: { _: "Number" },
                    },
                  ],
                  returnType: { _: "String" },
                  statementList: [
                    jsTs.statementReturn(
                      jsTs.callMethod(
                        jsTs.callMethod(
                          jsTs.variable(jsTs.identifierFromString("n")),
                          "toString",
                          [jsTs.numberLiteral(16)]
                        ),
                        "padStart",
                        [jsTs.numberLiteral(2), jsTs.stringLiteral("0")]
                      )
                    ),
                  ],
                },
              },
            ]
          ),
          "join",
          [jsTs.stringLiteral("")]
        ),

        jsTs.addition(parameterIndex, jsTs.numberLiteral(byteSize))
      ),
    ],
  };
};

const idByteSize = 16;
const tokenByteSize = 32;

const encodeIdIdentifier = jsTs.identifierFromString("encodeId");
const encodeIdVariable: jsTs.data.TsExpr = {
  _: "Variable",
  tsIdentifier: encodeIdIdentifier,
};
export const encodeIdFunction: jsTs.data.Function = encodeDefinition(
  idByteSize,
  encodeIdIdentifier,
  "UserId, ProjectIdなどのIdをバイナリ形式にエンコードする"
);

const encodeTokenIdentifier = jsTs.identifierFromString("encodeToken");
const encodeTokenVariable: jsTs.data.TsExpr = {
  _: "Variable",
  tsIdentifier: encodeTokenIdentifier,
};
export const tokenEncodeFunction: jsTs.data.Function = encodeDefinition(
  tokenByteSize,
  encodeTokenIdentifier,
  "ImageTokenなどのTokenをバイナリ形式にエンコードする"
);

const decodeIdIdentifier = jsTs.identifierFromString("decodeId");
const decodeIdVariable: jsTs.data.TsExpr = {
  _: "Variable",
  tsIdentifier: decodeIdIdentifier,
};
export const idDecodeFunction: jsTs.data.Function = decodeDefinition(
  idByteSize,
  decodeIdIdentifier,
  "バイナリ形式をUserId, ProjectIdなどのIdにデコードする"
);

const decodeTokenIdentifier = jsTs.identifierFromString("decodeToken");
const decodeTokenVariable: jsTs.data.TsExpr = {
  _: "Variable",
  tsIdentifier: decodeTokenIdentifier,
};
export const decodeTokenFunction: jsTs.data.Function = decodeDefinition(
  tokenByteSize,
  decodeTokenIdentifier,
  "バイナリ形式をImageTokenなどのTokenにエンコードする"
);

export const idEncodeDefinitionStatementList = (
  valueVar: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => [
  jsTs.statementReturn(
    jsTs.call({
      expr: encodeIdVariable,
      parameterList: [valueVar],
    })
  ),
];

export const idDecodeDefinitionStatementList = (
  typePartName: string,
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const targetType: jsTs.data.TsType = {
    _: "ScopeInFile",
    typeNameAndTypeParameter: {
      name: jsTs.identifierFromString(typePartName),
      arguments: [],
    },
  };
  return [
    {
      _: "Return",
      tsExpr: {
        _: "TypeAssertion",
        typeAssertion: {
          expr: {
            _: "Call",
            callExpr: {
              expr: decodeIdVariable,
              parameterList: [parameterIndex, parameterBinary],
            },
          },
          type: codec.decodeReturnType(targetType),
        },
      },
    },
  ];
};

export const tokenEncodeDefinitionStatementList = (
  valueVar: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => [
  jsTs.statementReturn(
    jsTs.call({
      expr: encodeTokenVariable,
      parameterList: [valueVar],
    })
  ),
];

export const tokenDecodeDefinitionStatementList = (
  typePartName: string,
  parameterIndex: jsTs.data.TsExpr,
  parameterBinary: jsTs.data.TsExpr
): ReadonlyArray<jsTs.data.Statement> => {
  const targetType = jsTs.typeScopeInFileNoArguments(
    jsTs.identifierFromString(typePartName)
  );
  return [
    jsTs.statementReturn({
      _: "TypeAssertion",
      typeAssertion: {
        expr: jsTs.call({
          expr: decodeTokenVariable,
          parameterList: [parameterIndex, parameterBinary],
        }),
        type: codec.decodeReturnType(targetType),
      },
    }),
  ];
};
