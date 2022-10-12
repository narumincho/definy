import { NonEmptyArray } from "../../deno-lib/util.ts";
import { TsIdentifier } from "./identifier.ts";

/**
 * 出力するコードの種類
 */
export type CodeType = "JavaScript" | "TypeScript";
/**
 * TypeScriptやJavaScriptのコードを表現する. TypeScriptでも出力できるように型情報をつける必要がある
 */
export type JsTsCode = {
  /**
   * 外部に公開する定義
   */
  readonly exportDefinitionList: ReadonlyArray<ExportDefinition>;
  /**
   * 定義した後に実行するコード
   */
  readonly statementList: ReadonlyArray<Statement>;
};

/**
 * 外部に公開する定義
 */
export type ExportDefinition =
  | { readonly type: "typeAlias"; readonly typeAlias: TypeAlias }
  | { readonly type: "function"; readonly function: Function }
  | { readonly type: "variable"; readonly variable: Variable };

/**
 * JavaScript の 文
 */
export type Statement =
  | { readonly _: "EvaluateExpr"; readonly tsExpr: TsExpr }
  | { readonly _: "Set"; readonly setStatement: SetStatement }
  | { readonly _: "If"; readonly ifStatement: IfStatement }
  | { readonly _: "ThrowError"; readonly tsExpr: TsExpr }
  | { readonly _: "Return"; readonly tsExpr: TsExpr }
  | { readonly _: "ReturnVoid" }
  | { readonly _: "Continue" }
  | {
      readonly _: "VariableDefinition";
      readonly variableDefinitionStatement: VariableDefinitionStatement;
    }
  | {
      readonly _: "FunctionDefinition";
      readonly functionDefinitionStatement: FunctionDefinitionStatement;
    }
  | { readonly _: "For"; readonly forStatement: ForStatement }
  | { readonly _: "ForOf"; readonly forOfStatement: ForOfStatement }
  | {
      readonly _: "WhileTrue";
      readonly statementList: ReadonlyArray<Statement>;
    }
  | { readonly _: "Break" }
  | { readonly _: "Switch"; readonly switchStatement: SwitchStatement };

/**
 * TypeAlias. `export type T = {}`
 */
export type TypeAlias = {
  /**
   * 名前空間
   */
  readonly namespace: ReadonlyArray<TsIdentifier>;
  /**
   * 型の名前
   */
  readonly name: TsIdentifier;
  /**
   * 型パラメーターのリスト
   */
  readonly typeParameterList: ReadonlyArray<TsIdentifier>;
  /**
   * ドキュメント
   */
  readonly document: string;
  /**
   * 型本体
   */
  readonly type: TsType;
};

/**
 * 外部に公開する関数
 */
export type Function = {
  /**
   * 外部に公開する関数の名前
   */
  readonly name: TsIdentifier;
  /**
   * ドキュメント
   */
  readonly document: string;
  /**
   * 型パラメーターのリスト
   */
  readonly typeParameterList: ReadonlyArray<TsIdentifier>;
  /**
   * パラメーター
   */
  readonly parameterList: ReadonlyArray<ParameterWithDocument>;
  /**
   * 戻り値の型
   */
  readonly returnType: TsType;
  /**
   * 関数の本体
   */
  readonly statementList: ReadonlyArray<Statement>;
};

/**
 * JavaScript の 式
 */
export type TsExpr =
  | { readonly _: "NumberLiteral"; readonly int32: number }
  | { readonly _: "StringLiteral"; readonly string: string }
  | { readonly _: "BooleanLiteral"; readonly bool: boolean }
  | { readonly _: "NullLiteral" }
  | { readonly _: "UndefinedLiteral" }
  | {
      readonly _: "UnaryOperator";
      readonly unaryOperatorExpr: UnaryOperatorExpr;
    }
  | {
      readonly _: "BinaryOperator";
      readonly binaryOperatorExpr: BinaryOperatorExpr;
    }
  | {
      readonly _: "ConditionalOperator";
      readonly conditionalOperatorExpr: ConditionalOperatorExpr;
    }
  | {
      readonly _: "ArrayLiteral";
      readonly arrayItemList: ReadonlyArray<ArrayItem>;
    }
  | {
      readonly _: "ObjectLiteral";
      readonly tsMemberList: ReadonlyArray<TsMember>;
    }
  | { readonly _: "Lambda"; readonly lambdaExpr: LambdaExpr }
  | { readonly _: "Variable"; readonly tsIdentifier: TsIdentifier }
  | { readonly _: "GlobalObjects"; readonly tsIdentifier: TsIdentifier }
  | {
      readonly _: "ImportedVariable";
      readonly importedVariable: ImportedVariable;
    }
  | { readonly _: "Get"; readonly getExpr: GetExpr }
  | { readonly _: "Call"; readonly callExpr: CallExpr }
  | { readonly _: "New"; readonly callExpr: CallExpr }
  | { readonly _: "TypeAssertion"; readonly typeAssertion: TypeAssertion };

export type Variable = {
  /**
   * 変数の名前
   */
  readonly name: TsIdentifier;
  /**
   * ドキュメント
   */
  readonly document: string;
  /**
   * 変数の型
   */
  readonly type: TsType;
  /**
   * 変数の式
   */
  readonly expr: TsExpr;
};

export type TsType =
  | { readonly _: "Number" }
  | { readonly _: "String" }
  | { readonly _: "Boolean" }
  | { readonly _: "Undefined" }
  | { readonly _: "Null" }
  | { readonly _: "Never" }
  | { readonly _: "Void" }
  | { readonly _: "unknown" }
  | {
      readonly _: "Object";
      readonly tsMemberTypeList: ReadonlyArray<TsMemberType>;
    }
  | { readonly _: "Function"; readonly functionType: FunctionType }
  | { readonly _: "Union"; readonly tsTypeList: ReadonlyArray<TsType> }
  | { readonly _: "Intersection"; readonly intersectionType: IntersectionType }
  | { readonly _: "ImportedType"; readonly importedType: ImportedType }
  | {
      readonly _: "ScopeInFile";
      readonly typeNameAndTypeParameter: TypeNameAndArguments;
    }
  | {
      readonly _: "ScopeInGlobal";
      readonly typeNameAndTypeParameter: TypeNameAndArguments;
    }
  | {
      readonly _: "WithNamespace";
      readonly namespace: NonEmptyArray<TsIdentifier>;
      readonly typeNameAndTypeParameter: TypeNameAndArguments;
    }
  | { readonly _: "StringLiteral"; readonly string: string };

/**
 * 代入文
 */
export type SetStatement = {
  /**
   * 対象となる式. 指定の仕方によってはJSのSyntaxErrorになる
   */
  readonly target: TsExpr;
  /**
   * 演算子を=の左につける
   */
  readonly operatorMaybe: BinaryOperator | undefined;
  /**
   * 式
   */
  readonly expr: TsExpr;
};

/**
 * if文
 */
export type IfStatement = {
  /**
   * 条件の式
   */
  readonly condition: TsExpr;
  /**
   * 条件がtrueのときに実行する文
   */
  readonly thenStatementList: ReadonlyArray<Statement>;
};

/**
 * 単項演算子と適用される式
 */
export type UnaryOperatorExpr = {
  /**
   * 単項演算子
   */
  readonly operator: UnaryOperator;
  /**
   * 適用される式
   */
  readonly expr: TsExpr;
};

/**
 * JavaScriptの単項演算子
 */
export type UnaryOperator = "Minus" | "BitwiseNot" | "LogicalNot" | "typeof";

/**
 * 2項演算子と左右の式
 */
export type BinaryOperatorExpr = {
  /**
   * 2項演算子
   */
  readonly operator: BinaryOperator;
  /**
   * 左の式
   */
  readonly left: TsExpr;
  /**
   * 右の式
   */
  readonly right: TsExpr;
};

/**
 * 2項演算子
 */
export type BinaryOperator =
  | "Exponentiation"
  | "Multiplication"
  | "Division"
  | "Remainder"
  | "Addition"
  | "Subtraction"
  | "LeftShift"
  | "SignedRightShift"
  | "UnsignedRightShift"
  | "LessThan"
  | "LessThanOrEqual"
  | "Equal"
  | "NotEqual"
  | "BitwiseAnd"
  | "BitwiseXOr"
  | "BitwiseOr"
  | "LogicalAnd"
  | "LogicalOr"
  | "??";

/**
 * ローカル変数定義
 */
export type VariableDefinitionStatement = {
  /**
   * 変数名
   */
  readonly name: TsIdentifier;
  /**
   * 変数の型
   */
  readonly type: TsType;
  /**
   * 式
   */
  readonly expr: TsExpr;
  /**
   * constかどうか. falseはlet
   */
  readonly isConst: boolean;
};

/**
 * ローカル関数定義
 */
export type FunctionDefinitionStatement = {
  /**
   * 変数名
   */
  readonly name: TsIdentifier;
  /**
   * 型パラメーターのリスト
   */
  readonly typeParameterList: ReadonlyArray<TsIdentifier>;
  /**
   * パラメーターのリスト
   */
  readonly parameterList: ReadonlyArray<ParameterWithDocument>;
  /**
   * 戻り値の型
   */
  readonly returnType: TsType;
  /**
   * 関数本体
   */
  readonly statementList: ReadonlyArray<Statement>;
};

/**
 * for文
 */
export type ForStatement = {
  /**
   * カウンタ変数名
   */
  readonly counterVariableName: TsIdentifier;
  /**
   * ループの上限の式
   */
  readonly untilExpr: TsExpr;
  /**
   * 繰り返す文
   */
  readonly statementList: ReadonlyArray<Statement>;
};

/**
 * switch文
 */
export type SwitchStatement = {
  /**
   * switch(a) {} の a
   */
  readonly expr: TsExpr;
  /**
   * case "text": { statementList }
   */
  readonly patternList: ReadonlyArray<TsPattern>;
};

/**
 * switch文のcase "text": { statementList } の部分
 */
export type TsPattern = {
  /**
   * case に使う文字列
   */
  readonly caseString: string;
  /**
   * マッチしたときに実行する部分
   */
  readonly statementList: ReadonlyArray<Statement>;
};

/**
 * forOf文
 */
export type ForOfStatement = {
  /**
   * 要素の変数名
   */
  readonly elementVariableName: TsIdentifier;
  /**
   * 繰り返す対象
   */
  readonly iterableExpr: TsExpr;
  /**
   * 繰り返す文
   */
  readonly statementList: ReadonlyArray<Statement>;
};

/**
 * ドキュメント付きの関数のパラメーター. パラメーター名, ドキュメント, 型
 */
export type ParameterWithDocument = {
  /**
   * パラメーター名
   */
  readonly name: TsIdentifier;
  /**
   * ドキュメント
   */
  readonly document: string;
  /**
   * パラメーターの型
   */
  readonly type: TsType;
};

/**
 * 条件演算子
 */
export type ConditionalOperatorExpr = {
  /**
   * 条件の式
   */
  readonly condition: TsExpr;
  /**
   * 条件がtrueのときに評価される式
   */
  readonly thenExpr: TsExpr;
  /**
   * 条件がfalseのときに評価される式
   */
  readonly elseExpr: TsExpr;
};

/**
 * 配列リテラルの要素
 */
export type ArrayItem = {
  /**
   * 式
   */
  readonly expr: TsExpr;
  /**
   * スプレッド ...a のようにするか
   */
  readonly spread: boolean;
};

/**
 * JavaScriptのオブジェクトリテラルの要素
 */
export type TsMember =
  | { readonly _: "Spread"; readonly tsExpr: TsExpr }
  | { readonly _: "KeyValue"; readonly keyValue: KeyValue };

/**
 * 文字列のkeyと式のvalue
 */
export type KeyValue = {
  /**
   * key
   */
  readonly key: string;
  /**
   * value
   */
  readonly value: TsExpr;
};
/**
 * ラムダ式
 */
export type LambdaExpr = {
  /**
   * パラメーターのリスト
   */
  readonly parameterList: ReadonlyArray<Parameter>;
  /**
   * 型パラメーターのリスト
   */
  readonly typeParameterList: ReadonlyArray<TsIdentifier>;
  /**
   * 戻り値の型
   */
  readonly returnType: TsType;
  /**
   * ラムダ式本体
   */
  readonly statementList: ReadonlyArray<Statement>;
};

/**
 * インポートした変数
 */
export type ImportedVariable = {
  /**
   * モジュール名, 使うときにはnamedインポートされ, そのモジュール識別子は自動的につけられる
   */
  readonly moduleName: string;
  /**
   * 変数名
   */
  readonly name: TsIdentifier;
};

/**
 * プロパティアクセス
 */
export type GetExpr = {
  /**
   * 式
   */
  readonly expr: TsExpr;
  /**
   * プロパティの式
   */
  readonly propertyExpr: TsExpr;
};

/**
 * 式と呼ぶパラメーター
 */
export type CallExpr = {
  /**
   * 呼ばれる式
   */
  readonly expr: TsExpr;
  /**
   * パラメーター
   */
  readonly parameterList: ReadonlyArray<TsExpr>;
};

/**
 * 型アサーション
 */
export type TypeAssertion = {
  /**
   * 型アサーションを受ける式
   */
  readonly expr: TsExpr;
  /**
   * 型
   */
  readonly type: TsType;
};

/**
 * オブジェクトのメンバーの型
 */
export type TsMemberType = {
  /**
   * プロパティ名
   */
  readonly name: string;
  /**
   * 必須かどうか falseの場合 ? がつく
   */
  readonly required: boolean;
  /**
   * 型
   */
  readonly type: TsType;
  /**
   * ドキュメント
   */
  readonly document: string;
};

/**
 * 関数の型
 */
export type FunctionType = {
  /**
   * 型パラメーターのリスト
   */
  readonly typeParameterList: ReadonlyArray<TsIdentifier>;
  /**
   * パラメーターの型. 意味のない引数名は適当に付く
   */
  readonly parameterList: ReadonlyArray<TsType>;
  /**
   * 戻り値の型
   */
  readonly return: TsType;
};

/**
 * パラメーター付きの型
 */
export type TsTypeWithTypeParameter = {
  /**
   * パラメーターをつけられる型
   */
  readonly type: TsType;
  /**
   * パラメーターに指定する型. なにも要素を入れなけければ T<>ではなく T の形式で出力される
   */
  readonly typeParameterList: ReadonlyArray<TsType>;
};

/**
 * 交差型
 */
export type IntersectionType = {
  /**
   * 左に指定する型
   */
  readonly left: TsType;
  /**
   * 右に指定する型
   */
  readonly right: TsType;
};

/**
 * インポートされた型
 */
export type ImportedType = {
  /**
   * モジュール名. namedImportされるがその識別子は自動的に作成される
   */
  readonly moduleName: string;
  /**
   * 型の名前とパラメータ
   */
  readonly nameAndArguments: TypeNameAndArguments;
};

export type TypeNameAndArguments = {
  readonly name: TsIdentifier;
  readonly arguments: ReadonlyArray<TsType>;
};

/**
 * 関数のパラメーター. パラメーター名, 型
 */
export type Parameter = {
  /**
   * パラメーター名
   */
  readonly name: TsIdentifier;
  /**
   * パラメーターの型
   */
  readonly type: TsType;
};
