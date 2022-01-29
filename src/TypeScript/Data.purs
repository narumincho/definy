module TypeScript.Data
  ( BinaryOperator(..)
  , BinaryOperatorExpr(..)
  , ConditionalOperatorExpr(..)
  , ExportDefinition(..)
  , Expr(..)
  , ForOfStatement(..)
  , ForStatement(..)
  , FunctionDeclaration(..)
  , FunctionDefinitionStatement(..)
  , FunctionType(..)
  , IfStatement(..)
  , ImportedType(..)
  , JavaScriptContent(..)
  , ParameterWithDocument(..)
  , Pattern(..)
  , SetStatement(..)
  , Statement(..)
  , SwitchStatement(..)
  , TsMemberType(..)
  , TsType(..)
  , TypeAlias(..)
  , TypeNameAndTypeParameter(..)
  , TypeScriptModule(..)
  , TypeScriptModuleMap(..)
  , UnaryOperator(..)
  , UnaryOperatorExpr(..)
  , VariableDeclaration(..)
  , VariableDefinitionStatement(..)
  ) where

import Data.Map as Map
import Data.Maybe (Maybe)
import Data.Tuple as Tuple
import TypeScript.Identifier (TsIdentifier)
import TypeScript.ModuleName as ModuleName

newtype TypeScriptModuleMap
  = TypeScriptModuleMap
  (Map.Map ModuleName.ModuleName TypeScriptModule)

-- | TypeScriptやJavaScriptのコードを表現する. TypeScriptでも出力できるように型情報をつける必要がある
newtype TypeScriptModule
  = TypeScriptModule
  { {- 外部に公開する定義 -} exportDefinitionList :: Array ExportDefinition
  }

newtype JavaScriptContent
  = JavaScriptContent
  { {- 外部に公開する定義 -} exportDefinitionList :: Array ExportDefinition
  , {- 定義した後に実行するコード -} statementList :: Array Statement
  }

-- | 外部に公開する定義
data ExportDefinition
  = ExportDefinitionTypeAlias TypeAlias
  | ExportDefinitionFunction FunctionDeclaration
  | ExportDefinitionVariable VariableDeclaration

-- | TypeAlias
-- | ```ts
-- | export type T = {}
-- | ```
newtype TypeAlias
  = TypeAlias
  { {- 型の名前 -} name :: TsIdentifier
  , {- 型パラメーターのリスト -} typeParameterList :: Array TsIdentifier
  , {- ドキュメント -} document :: String
  , {- 型本体 -} type :: TsType
  }

-- | TypeScriptの関数
newtype FunctionDeclaration
  = FunctionDeclaration
  { {- 関数名 -} name :: TsIdentifier
  , {- ドキュメント -} document :: String
  , {- 型パラメーターのリスト -} typeParameterList :: Array TsIdentifier
  , {- パラメーター -} parameterList :: Array ParameterWithDocument
  , {- 戻り値の型 -} returnType :: TsType
  , {- 関数の本体 -} statementList :: Array Statement
  }

-- | ドキュメント付きの関数のパラメーター. パラメーター名, ドキュメント, 型
newtype ParameterWithDocument
  = ParameterWithDocument
  { {- パラメーター名 -} name :: TsIdentifier
  , {- ドキュメント -} document :: String
  , {- パラメーターの型 -} type :: TsType
  }

-- | 変数定義
newtype VariableDeclaration
  = VariableDeclaration
  { {- 変数の名前 -} name :: TsIdentifier
  , {- ドキュメント -} document :: String
  , {- 変数の型 -} type :: TsType
  , {- 変数の式 -} expr :: Expr
  }

-- | TypeScript の型
data TsType
  = TsTypeNumber
  | TsTypeString
  | TsTypeBoolean
  | TsTypeUndefined
  | TsTypeNull
  | TsTypeNever
  | TsTypeVoid
  | TsTypeObject (Array TsMemberType)
  | TsTypeFunction FunctionType
  | TsTypeUnion (Array TsType)
  | TsTypeIntersection (Tuple.Tuple TsType TsType)
  | TsTypeImportedType ImportedType
  | TsTypeScopeInFile TypeNameAndTypeParameter
  | TsTypeScopeInGlobal TypeNameAndTypeParameter
  | TsTypeStringLiteral String

-- | オブジェクトのメンバーの型
newtype TsMemberType
  = TsMemberType
  { name :: String
  , {- 必須かどうか falseの場合 ? がつく -} required :: Boolean
  , type :: TsType
  , document :: String
  }

newtype FunctionType
  = FunctionType
  { typeParameterList :: Array TsIdentifier
  , {- パラメーターの型. 意味のない引数名は適当に付く -} parameterList :: Array TsType
  , return :: TsType
  }

newtype ImportedType
  = ImportedType
  { moduleName :: ModuleName.ModuleName
  , typeNameAndTypeParameter :: TypeNameAndTypeParameter
  }

newtype TypeNameAndTypeParameter
  = TypeNameAndTypeParameter
  { name :: TsIdentifier
  , typeParameterList :: Array TsType
  }

data Expr
  = {- 数値リテラル `123` -} NumberLiteral Number
  | {- 文字列リテラル `"text"` -} StringLiteral String
  | {- booleanリテラル -} BooleanLiteral Boolean
  | {- `null` -} NullLiteral
  | {- `undefined` -} UndefinedLiteral
  | {- 単項演算子での式 -} UnaryOperator UnaryOperatorExpr
  | {- 2項演算子での式 -} BinaryOperator BinaryOperatorExpr
  | {- 件演算子 `a ? b : c` -} ConditionalOperator ConditionalOperatorExpr
  | {- 配列リテラル `[1, 2, 3]` -} ArrayLiteral
  | {- オブジェクトリテラル `{ data: 123, text: "sorena" }` -} ObjectLiteral
  | {- ラムダ式 `() => {}` -} Lambda
  | {- 変数. 変数が存在するかのチャックがされる -} Variable
  | {- グローバルオブジェクト -} GlobalObjects TsIdentifier
  | {- インポートされた変数 -} ImportedVariable
  | {- プロパティの値を取得する `a.b a[12] data[f(2)]` -} Get
  | {- 関数を呼ぶ `f(x)`` -} Call
  | {- 式からインスタンスを作成する `new Date()` -} New
  | {- 型アサーション `a as string` -} TypeAssertion

-- | 単項演算子と適用される式
newtype UnaryOperatorExpr
  = UnaryOperatorExpr
  { {- 単項演算子 -} operator :: UnaryOperator
  , {- 適用される式 -} expr :: Expr
  }

-- | 単項演算子
data UnaryOperator
  = Minus
  | BitwiseNot
  | LogicalNot

-- | 2項演算子と左右の式
newtype BinaryOperatorExpr
  = BinaryOperatorExpr
  { {- 2項演算子 -} operator :: BinaryOperator
  , {- 左の式 -} left :: Expr
  , {- 右の式 -} right :: Expr
  }

-- | 2項演算子
data BinaryOperator
  = {- べき乗 `a ** b` -} Exponentiation
  | {- 数値の掛け算 `a * b` -} Multiplication
  | {- 数値の割り算 `a / b` -} Division
  | {- 剰余演算 `a % b` -} Remainder
  | {- 数値の足し算, 文字列の結合 `a + b` -} Addition
  | Subtraction
  | LeftShift
  | SignedRightShift
  | UnsignedRightShift
  | LessThan
  | LessThanOrEqual
  | Equal
  | NotEqual
  | BitwiseAnd
  | BitwiseXOr
  | BitwiseOr
  | LogicalAnd
  | LogicalOr

-- | 条件演算子
newtype ConditionalOperatorExpr
  = ConditionalOperatorExpr
  { {- 条件の式 -} condition :: Expr
  , {- 条件がtrueのときに評価される式 -} thenExpr :: Expr
  , {- 条件がfalseのときに評価される式 -} elseExpr :: Expr
  }

-- | TypeScript の文
data Statement
  = EvaluateExpr Expr
  | Set SetStatement
  | If IfStatement
  | ThrowError Expr
  | Return Expr
  | ReturnVoid
  | Continue
  | VariableDefinition VariableDefinitionStatement
  | FunctionDefinition FunctionDefinitionStatement
  | For ForStatement
  | ForOf ForOfStatement
  | WhileTrue (Array Statement)
  | Break
  | Switch SwitchStatement

-- | 代入文
newtype SetStatement
  = SetStatement
  { {- 対象となる式. 指定の仕方によってはJSのSyntaxErrorになる -} target :: Expr
  , {- 演算子を=の左につける -} operatorMaybe :: Maybe BinaryOperator
  , {- 式 -} expr :: Expr
  }

newtype IfStatement
  = IfStatement
  { {- 条件の式 -} condition :: Expr
  , {- 条件がtrueのときに実行する文 -} thenStatementList :: Array Statement
  }

newtype VariableDefinitionStatement
  = VariableDefinitionStatement
  { name :: TsIdentifier, type :: TsType, expr :: Expr, isConst :: Boolean }

newtype FunctionDefinitionStatement
  = FunctionDefinitionStatement
  { name :: TsIdentifier
  , typeParameterList :: Array TsIdentifier
  , parameterList :: Array ParameterWithDocument
  , returnType :: TsType
  , statementList :: Array Statement
  }

newtype ForStatement
  = ForStatement
  { {- カウンタ変数名 -} counterVariableName :: TsIdentifier
  , {- ループの上限の式 -} untilExpr :: Expr
  , {- 繰り返す文 -} statementList :: Array Statement
  }

newtype ForOfStatement
  = ForOfStatement
  { {- 要素の変数名 -} elementVariableName :: TsIdentifier
  , {- 繰り返す対象 -} iterableExpr :: Expr
  , {- 繰り返す文 -} statementList :: Array Statement
  }

newtype SwitchStatement
  = SwitchStatement
  { expr :: Expr
  , patternList :: Array Pattern
  }

newtype Pattern
  = Pattern
  { {- case に使う文字列 -} caseString :: String
  , {- マッチしたときに実行する部分 -} statementList :: Array Statement
  }
