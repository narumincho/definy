export type DartCode = {
  readonly importPackageAndFileNames: ReadonlyArray<
    ImportPackageFileNameAndAsName
  >;
  readonly declarationList: ReadonlyArray<Declaration>;
};

export type ImportPackageFileNameAndAsName = {
  readonly packageAndFileName: string;
  readonly asName: string;
};

export type Declaration = {
  readonly type: "ClassDeclaration";
  readonly name: string;
  readonly documentationComments: string;
  readonly fields: string;
  readonly isAbstract: boolean;
  readonly implementsClassList: ReadonlyArray<string>;
  readonly staticFields: ReadonlyArray<StaticField>;
  readonly method: ReadonlyArray<Method>;
  readonly isPrivateConstructor: boolean;
} | {
  readonly type: "EnumDeclaration";
  readonly name: string;
  readonly documentationComments: string;
  readonly enumValues: ReadonlyArray<EnumValue>;
  readonly implementsClassList: ReadonlyArray<string>;
  readonly methods: ReadonlyArray<Method>;
};

export type StaticField = {
  readonly name: string;
  readonly documentationComments: string;
  readonly type: Type;
  readonly expr: Expr;
};

export type Method = {
  readonly name: string;
  readonly documentationComments: string;
  readonly returnType: Type;
  readonly parameters: ReadonlyArray<Parameter>;
  readonly methodType: MethodType;
  readonly statements: ReadonlyArray<Statement>;
  readonly isAsync: boolean;
  readonly typeParameters: ReadonlyArray<string>;
  readonly isGetter: boolean;
  readonly useResultAnnotation: boolean;
};

export type Parameter = {
  readonly name: string;
  readonly type: Type;
  readonly parameterPattern: ParameterPattern;
};

export type ParameterPattern = {
  readonly type: "Positional";
} | {
  readonly type: "Named";
} | {
  readonly type: "NamedWithDefault";
  readonly constDefaultExpr: Expr;
};

export type MethodType =
  | "normal"
  | "override"
  | "static";

export type EnumValue = {
  readonly name: string;
  readonly documentationComments: string;
};

export type Type = {
  readonly type: "Function";
  readonly returnType: Type;
  readonly parameters: ReadonlyArray<
    { readonly name: string; readonly type: Type }
  >;
  readonly isNullable: boolean;
} | {
  readonly type: "Normal";
  readonly name: string;
  readonly arguments: ReadonlyArray<Type>;
  readonly isNullable: boolean;
};

export type Expr = { readonly type: "IntLiteral"; readonly value: number } | {
  readonly type: "StringLiteral";
  readonly items: ReadonlyArray<StringLiteralItem>;
} | {
  readonly type: "EnumValue";
  readonly typeName: string;
  readonly value: string;
} | {
  readonly type: "MethodCall";
  readonly variable: Expr;
  readonly methodName: string;
  readonly positionalArguments: ReadonlyArray<Expr>;
  readonly namedArguments: ReadonlyArray<
    { readonly name: string; readonly expr: Expr }
  >;
  readonly optionalChaining: boolean;
} | {
  readonly type: "Constructor";
  readonly className: string;
  readonly positionalArguments: ReadonlyArray<Expr>;
  readonly namedArguments: ReadonlyArray<
    { readonly name: string; readonly expr: Expr }
  >;
  readonly isConst: boolean;
} | {
  readonly type: "Lambda";
  readonly parameterNames: ReadonlyArray<string>;
  readonly statements: ReadonlyArray<Statement>;
} | {
  readonly type: "ListLiteral";
  readonly items: ReadonlyArray<Expr>;
} | {
  readonly type: "MapLiteral";
  readonly items: ReadonlyArray<{ readonly key: Expr; readonly value: Expr }>;
} | {
  readonly type: "Variable";
  readonly name: string;
  readonly isConst: boolean;
} | {
  readonly type: "Get";
  readonly expr: Expr;
  readonly fieldName: string;
} | {
  readonly type: "Is";
  readonly expr: Expr;
  readonly type_: Type;
} | {
  readonly type: "Operator";
  readonly left: Expr;
  readonly right: Expr;
  readonly operator: Operator;
} | {
  readonly type: "Null";
} | {
  readonly type: "Bool";
  readonly value: boolean;
} | {
  readonly type: "ConditionalOperator";
  readonly condition: Expr;
  readonly thenExpr: Expr;
  readonly elseExpr: Expr;
} | {
  readonly type: "Call";
  readonly functionName: string;
  readonly positionalArguments: ReadonlyArray<Expr>;
  readonly namedArguments: ReadonlyArray<{ name: string; expr: Expr }>;
  readonly isAwait: boolean;
};

type Operator =
  | "nullishCoalescing"
  | "notEqual"
  | "equal"
  | "add"
  | "logicalAnd";

export type StringLiteralItem = {
  readonly type: "Interpolation";
  readonly expr: Expr;
} | {
  readonly type: "Normal";
  readonly value: string;
};

export type Statement = {
  readonly type: "Return";
  readonly expr: Expr;
} | {
  readonly type: "Final";
  readonly variableName: string;
  readonly expr: Expr;
} | {
  readonly type: "If";
  readonly condition: Expr;
  readonly thenStatement: ReadonlyArray<Statement>;
} | {
  readonly type: "Switch";
  readonly expr: Expr;
  readonly patternList: ReadonlyArray<
    { readonly pattern: Expr; readonly statements: ReadonlyArray<Statement> }
  >;
} | {
  readonly type: "Throw";
  readonly expr: Expr;
};
