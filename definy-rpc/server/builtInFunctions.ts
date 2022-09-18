import { ApiFunction, createApiFunction } from "./apiFunction.ts";
import { set, string, unit, list, DefinyRpcType, product } from "./type.ts";
import { generateCodeAsString } from "./jsTs/main.ts";
import { identifierFromString } from "./jsTs/identifier.ts";
import {
  ExportDefinition,
  TsExpr,
  TsMember,
  TsMemberType,
  TsType,
} from "./jsTs/data.ts";
import * as tsInterface from "./jsTs/interface.ts";

const definyRpcNamespace = "definyRpc";

type Type = {
  readonly fullName: ReadonlyArray<string>;
  readonly description: string;
  readonly parameters: ReadonlyArray<Type>;
};

const Type: DefinyRpcType<Type> = product<Type>({
  fullName: [definyRpcNamespace, "Type"],
  description: "definyRpc で表現できる型",
  fieldList: {
    fullName: {
      type: list(string),
      description: "完全名",
    },
    description: {
      type: string,
      description: "",
    },
    parameters: {
      type: () => list(Type),
      description: "型パラメーター",
    },
  },
});

type FunctionDetail = {
  readonly name: ReadonlyArray<string>;
  readonly description: string;
  readonly input: Type;
  readonly output: Type;
};

const FunctionDetail = product<FunctionDetail>({
  fullName: [definyRpcNamespace, "FunctionDetail"],
  description: "functionByNameの結果",
  fieldList: {
    name: {
      description: "名前空間付き, 関数名",
      type: list<string>(string),
    },
    description: { description: "関数の説明文", type: string },
    input: { description: "関数の入力の型", type: Type },
    output: { description: "関数の出力の型", type: Type },
  },
});

export const addDefinyRpcApiFunction = (
  name: string,
  // deno-lint-ignore no-explicit-any
  all: () => ReadonlyArray<ApiFunction<any, any, boolean>>
  // deno-lint-ignore no-explicit-any
): ReadonlyArray<ApiFunction<any, any, boolean>> => {
  return [
    ...builtInFunctions(name, all),
    ...all().map((func) => ({
      ...func,
      fullName: [name, ...func.fullName] as const,
    })),
  ];
};

const builtInFunctions = (
  name: string,
  // deno-lint-ignore no-explicit-any
  all: () => ReadonlyArray<ApiFunction<any, any, boolean>>
) => {
  return [
    createApiFunction({
      fullName: [definyRpcNamespace, "name"],
      description: "サーバー名の取得",
      input: unit,
      output: string,
      needAuthentication: false,
      isMutation: false,
      resolve: () => {
        return name;
      },
    }),
    createApiFunction({
      fullName: [definyRpcNamespace, "namespaceList"],
      description:
        "get namespace list. namespace は API の公開非公開, コード生成のモジュールを分けるチャンク",
      input: unit,
      output: set<ReadonlyArray<string>>(list<string>(string)),
      needAuthentication: false,
      isMutation: false,
      resolve: () => {
        return new Set(
          [
            ...new Set(
              addDefinyRpcApiFunction(name, all).map((func) =>
                func.fullName.slice(0, -1).join(".")
              )
            ),
          ].map((e) => e.split("."))
        );
      },
    }),
    createApiFunction({
      fullName: [definyRpcNamespace, "functionListByName"],
      description: "名前から関数を検索する (公開APIのみ)",
      input: unit,
      output: list<FunctionDetail>(FunctionDetail),
      isMutation: false,
      needAuthentication: false,
      resolve: () => {
        const allFunc = addDefinyRpcApiFunction(name, all);
        return allFunc.map<FunctionDetail>((f) => ({
          name: f.fullName,
          description: f.description,
          input: definyRpcTypeBodyToType(f.input),
          output: definyRpcTypeBodyToType(f.output),
        }));
      },
    }),
    createApiFunction({
      fullName: [definyRpcNamespace, "functionListByNamePrivate"],
      description: "名前から関数を検索する (非公開API)",
      input: unit,
      output: list<FunctionDetail>(FunctionDetail),
      isMutation: false,
      needAuthentication: true,
      resolve: (_, _accountToken) => {
        const allFunc = addDefinyRpcApiFunction(name, all);
        return allFunc.map<FunctionDetail>((f) => ({
          name: f.fullName,
          description: f.description,
          input: definyRpcTypeBodyToType(f.input),
          output: definyRpcTypeBodyToType(f.output),
        }));
      },
    }),
    createApiFunction({
      fullName: [definyRpcNamespace, "generateCallDefinyRpcTypeScriptCode"],
      description:
        "名前空間「definyRpc」のApiFunctionを呼ぶ TypeScript のコードを生成する",
      input: unit,
      output: string,
      isMutation: false,
      needAuthentication: false,
      resolve: () => {
        const allFunc = addDefinyRpcApiFunction(name, all).filter(
          (f) => f.fullName[0] === definyRpcNamespace
        );
        return apiFunctionListToCode(allFunc);
      },
    }),
  ];
};

const definyRpcTypeBodyToType = <t>(definyRpcType: DefinyRpcType<t>): Type => {
  return {
    fullName: definyRpcType.fullName,
    description: definyRpcType.description,
    parameters: definyRpcType.parameters.map(definyRpcTypeBodyToType),
  };
};

const apiFunctionListToCode = <input, output>(
  apiFunctionList: ReadonlyArray<ApiFunction<input, output, boolean>>
): string => {
  const needAuthentication = apiFunctionList.some(
    (func) => func.needAuthentication
  );
  return generateCodeAsString(
    {
      exportDefinitionList: [
        ...(needAuthentication ? [accountTokenExportDefinition] : []),
        {
          type: "variable",
          variable: {
            name: identifierFromString(definyRpcNamespace),
            document: "definyRpc の ApiFunctions を呼ぶ",
            type: {
              _: "Object",
              tsMemberTypeList: apiFunctionList.map(
                (func): TsMemberType => ({
                  name: func.fullName.slice(1).join("_"),
                  document: func.description,
                  required: true,
                  type: {
                    _: "Function",
                    functionType: {
                      typeParameterList: [],
                      parameterList: [
                        ...(func.input.body.type === "unit"
                          ? []
                          : [definyRpcTypeToTsType(func.input)]),
                        ...(func.needAuthentication
                          ? [
                              {
                                _: "ScopeInFile",
                                tsIdentifier:
                                  identifierFromString("AccountToken"),
                              } as const,
                            ]
                          : []),
                      ],
                      return: tsInterface.promiseType(
                        definyRpcTypeToTsType(func.output)
                      ),
                    },
                  },
                })
              ),
            },
            expr: {
              _: "ObjectLiteral",
              tsMemberList: apiFunctionList.map(
                (func): TsMember => ({
                  _: "KeyValue",
                  keyValue: {
                    key: func.fullName.slice(1).join("_"),
                    value: funcExpr(func),
                  },
                })
              ),
            },
          },
        },
      ],
      statementList: [],
    },
    "TypeScript"
  );
};

const definyRpcTypeToTsType = <t>(definyRpcType: DefinyRpcType<t>): TsType => {
  switch (definyRpcType.body.type) {
    case "string":
      return { _: "String" };
    case "number":
      return { _: "Number" };
    case "unit":
      return { _: "Undefined" };
    case "list":
      return tsInterface.readonlyArrayType({ _: "Undefined" });
    case "set":
      return tsInterface.setType({ _: "Undefined" });
    case "sum":
      return { _: "Undefined" };
    case "product":
      return { _: "Undefined" };
  }
};

const accountTokenExportDefinition: ExportDefinition = {
  type: "typeAlias",
  typeAlias: {
    name: identifierFromString("AccountToken"),
    document: "認証が必要なリクエストに使用する",
    typeParameterList: [],
    type: {
      _: "Intersection",
      intersectionType: {
        left: { _: "String" },
        right: {
          _: "Object",
          tsMemberTypeList: [
            {
              name: "__accountTokenBland",
              document: "",
              required: true,
              type: { _: "Never" },
            },
          ],
        },
      },
    },
  },
};

const funcExpr = <input, output>(
  func: ApiFunction<input, output, boolean>
): TsExpr => {
  return {
    _: "Lambda",
    lambdaExpr: {
      parameterList: [
        ...(func.input.body.type === "unit"
          ? []
          : [
              {
                name: identifierFromString("input"),
                type: definyRpcTypeToTsType(func.input),
              },
            ]),
        ...(func.needAuthentication
          ? ([
              {
                name: identifierFromString("input"),
                type: {
                  _: "ScopeInFile",
                  tsIdentifier: identifierFromString("AccountToken"),
                },
              },
            ] as const)
          : []),
      ],
      returnType: tsInterface.promiseType(definyRpcTypeToTsType(func.output)),
      typeParameterList: [],
      statementList: [
        {
          _: "Return",
          tsExpr: tsInterface.callMethod(
            tsInterface.callMethod(
              {
                _: "Call",
                callExpr: {
                  expr: {
                    _: "GlobalObjects",
                    tsIdentifier: identifierFromString("fetch"),
                  },
                  parameterList: [{ _: "StringLiteral", string: "...." }],
                },
              },
              "then",
              [
                {
                  _: "Lambda",
                  lambdaExpr: {
                    parameterList: [
                      {
                        name: identifierFromString("response"),
                        type: {
                          _: "ScopeInGlobal",
                          tsIdentifier: identifierFromString("Response"),
                        },
                      },
                    ],
                    returnType: tsInterface.promiseType(
                      definyRpcTypeToTsType(func.output)
                    ),
                    typeParameterList: [],
                    statementList: [
                      {
                        _: "EvaluateExpr",
                        tsExpr: tsInterface.callMethod(
                          {
                            _: "Variable",
                            tsIdentifier: identifierFromString("response"),
                          },
                          "json",
                          []
                        ),
                      },
                    ],
                  },
                },
              ]
            ),
            "catch",
            [
              {
                _: "Lambda",
                lambdaExpr: {
                  parameterList: [],
                  returnType: tsInterface.promiseType(
                    definyRpcTypeToTsType(func.output)
                  ),
                  typeParameterList: [],
                  statementList: [],
                },
              },
            ]
          ),
        },
      ],
    },
  };
};
