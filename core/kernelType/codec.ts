import * as util from "../util";
import { jsTs } from "../../deno-lib/npm";

export const codecTypeWithTypeParameter = (
  typeName: jsTs.TsIdentifier,
  typeParameterList: ReadonlyArray<string>
): jsTs.data.TsType => {
  if (typeParameterList.length === 0) {
    codecType(jsTs.typeScopeInFileNoArguments(typeName));
  }
  return {
    _: "Function",
    functionType: {
      typeParameterList: typeParameterList.map(jsTs.identifierFromString),
      parameterList: typeParameterList.map((typeParameter) =>
        codecType({
          _: "ScopeInFile",
          typeNameAndTypeParameter: {
            name: jsTs.identifierFromString(typeParameter),
            arguments: [],
          },
        })
      ),
      return: codecType({
        _: "ScopeInFile",
        typeNameAndTypeParameter: {
          name: typeName,
          arguments: typeParameterList.map((typeParameter) =>
            jsTs.typeScopeInFileNoArguments(
              jsTs.identifierFromString(typeParameter)
            )
          ),
        },
      }),
    },
  };
};

const codecName = jsTs.identifierFromString("Codec");

/**
 * ```ts
 * Codec<type_>
 * ```
 * を表す
 */
export const codecType = (type_: jsTs.data.TsType): jsTs.data.TsType => ({
  _: "ScopeInFile",
  typeNameAndTypeParameter: {
    name: codecName,
    arguments: [type_],
  },
});

export const codecTypeAlias = (): jsTs.data.TypeAlias => {
  const typeParameterIdentifier = jsTs.identifierFromString("T");
  return {
    name: codecName,
    namespace: [],
    document: "バイナリと相互変換するための関数",
    typeParameterList: [typeParameterIdentifier],
    type: {
      _: "Object",
      tsMemberTypeList: [
        {
          name: util.encodePropertyName,
          required: true,
          type: encodeFunctionType({
            _: "ScopeInFile",
            typeNameAndTypeParameter: {
              name: typeParameterIdentifier,
              arguments: [],
            },
          }),
          document: "",
        },
        {
          name: util.decodePropertyName,
          required: true,
          type: decodeFunctionType({
            _: "ScopeInFile",
            typeNameAndTypeParameter: {
              name: typeParameterIdentifier,
              arguments: [],
            },
          }),
          document: "",
        },
      ],
    },
  };
};

export const variableDefinition = (
  name: jsTs.TsIdentifier,
  type_: jsTs.data.TsType,
  document: string,
  codecDocument: string,
  encodeDefinition: jsTs.data.TsExpr,
  decodeDefinition: jsTs.data.TsExpr
): jsTs.data.Variable => ({
  name,
  document,
  type: {
    _: "Object",
    tsMemberTypeList: [
      {
        name: util.codecPropertyName,
        required: true,
        type: codecType(type_),
        document: codecDocument,
      },
    ],
  },
  expr: jsTs.objectLiteral([
    {
      _: "KeyValue",
      keyValue: {
        key: util.codecPropertyName,
        value: jsTs.objectLiteral([
          {
            _: "KeyValue",
            keyValue: {
              key: util.encodePropertyName,
              value: encodeDefinition,
            },
          },
          {
            _: "KeyValue",
            keyValue: {
              key: util.decodePropertyName,
              value: decodeDefinition,
            },
          },
        ]),
      },
    },
  ]),
});

/**
 * ```ts
 * (a: type_) => Readonly<number>
 * ```
 */
export const encodeFunctionType = (
  type_: jsTs.data.TsType
): jsTs.data.TsType => ({
  _: "Function",
  functionType: {
    typeParameterList: [],
    parameterList: [type_],
    return: encodeReturnType,
  },
});

export const encodeLambda = (
  type_: jsTs.data.TsType,
  statementList: (
    valueExpr: jsTs.data.TsExpr
  ) => ReadonlyArray<jsTs.data.Statement>
): jsTs.data.TsExpr => {
  const valueName = jsTs.identifierFromString("value");
  return {
    _: "Lambda",
    lambdaExpr: {
      typeParameterList: [],
      parameterList: [
        {
          name: valueName,
          type: type_,
        },
      ],
      returnType: encodeReturnType,
      statementList: statementList({ _: "Variable", tsIdentifier: valueName }),
    },
  };
};

export const encodeReturnType = jsTs.readonlyArrayType({ _: "Number" });
/**
 * ```ts
 * (a: number, b: Uint8Array) => { readonly result: type_, readonly nextIndex: number }
 * ```
 */
export const decodeFunctionType = (
  type_: jsTs.data.TsType
): jsTs.data.TsType => ({
  _: "Function",
  functionType: {
    typeParameterList: [],
    parameterList: decodeParameterList.map((parameter) => parameter.type),
    return: decodeReturnType(type_),
  },
});

export const decodeReturnType = (
  type_: jsTs.data.TsType
): jsTs.data.TsType => ({
  _: "Object",
  tsMemberTypeList: [
    {
      name: util.resultProperty,
      required: true,
      type: type_,
      document: "",
    },
    {
      name: util.nextIndexProperty,
      required: true,
      type: { _: "Number" },
      document: "",
    },
  ],
});

export const indexIdentifier = jsTs.identifierFromString("index");
export const binaryIdentifier = jsTs.identifierFromString("binary");

/**
 * ( index: number, binary: Uint8Array )
 */
export const decodeParameterList: ReadonlyArray<jsTs.data.ParameterWithDocument> =
  [
    {
      name: indexIdentifier,
      type: { _: "Number" },
      document: "バイナリを読み込み開始位置",
    },
    {
      name: binaryIdentifier,
      type: jsTs.uint8ArrayType,
      document: "バイナリ",
    },
  ];

/**
 * ```ts
 * return { result: resultExpr, nextIndex: nextIndexExpr }
 * ```
 * を表現するコード
 */
export const returnStatement = (
  resultExpr: jsTs.data.TsExpr,
  nextIndexExpr: jsTs.data.TsExpr
): jsTs.data.Statement => ({
  _: "Return",
  tsExpr: jsTs.objectLiteral([
    jsTs.memberKeyValue(util.resultProperty, resultExpr),
    jsTs.memberKeyValue(util.nextIndexProperty, nextIndexExpr),
  ]),
});

export const decodeLambda = (
  type: jsTs.data.TsType,
  statementList: (
    parameterIndex: jsTs.data.TsExpr,
    parameterBinary: jsTs.data.TsExpr
  ) => ReadonlyArray<jsTs.data.Statement>
): jsTs.data.TsExpr => {
  return {
    _: "Lambda",
    lambdaExpr: {
      typeParameterList: [],
      parameterList: decodeParameterList,
      returnType: decodeReturnType(type),
      statementList: statementList(
        jsTs.variable(indexIdentifier),
        jsTs.variable(binaryIdentifier)
      ),
    },
  };
};

/**
 * ```ts
 * expr.result
 * ```
 */
export const getResult = (
  resultAndNextIndexExpr: jsTs.data.TsExpr
): jsTs.data.TsExpr => jsTs.get(resultAndNextIndexExpr, util.resultProperty);

/**
 * ```ts
 * expr.nextIndex
 * ```
 */
export const getNextIndex = (
  resultAndNextIndexExpr: jsTs.data.TsExpr
): jsTs.data.TsExpr => jsTs.get(resultAndNextIndexExpr, util.nextIndexProperty);

/**
 * 名前の末尾に `Codec` をつける
 */
export const codecParameterName = (name: string): jsTs.TsIdentifier =>
  jsTs.identifierFromString(name + "Codec");
