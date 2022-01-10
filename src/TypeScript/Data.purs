module TypeScript.Data
  ( BinaryOperator(..)
  , BinaryOperatorExpr(..)
  , ConditionalOperatorExpr(..)
  , ExportDefinition(..)
  , Expr(..)
  , FunctionDeclaration(..)
  , Module(..)
  , ParameterWithDocument(..)
  , Statement(..)
  , TsIdentifier(..)
  , TsType(..)
  , TypeAlias(..)
  , UnaryOperator(..)
  , UnaryOperatorExpr(..)
  , VariableDeclaration(..)
  ) where

import Data.String.NonEmpty (NonEmptyString)
import TypeScript.ModuleName as ModuleName

-- | TypeScriptやJavaScriptのコードを表現する. TypeScriptでも出力できるように型情報をつける必要がある
newtype Module
  = Module
  { name :: ModuleName.ModuleName
  , {- 外部に公開する定義 -} exportDefinitionList :: Array ExportDefinition
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
  | TsTypeObject
  | TsTypeFunction
  | TsTypeWithTypeParameter
  | TsTypeUnion
  | TsTypeIntersection
  | TsTypeImportedType
  | TsTypeScopeInFile
  | TsTypeScopeInGlobal
  | TsTypeStringLiteral

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

newtype TsIdentifier
  = TsIdentifier NonEmptyString

-- | TypeScript の文
data Statement
  = EvaluateExpr
  | Set
  | If
  | ThrowError
  | Return
  | ReturnVoid
  | Continue
  | VariableDefinition
  | FunctionDefinition
  | For
  | ForOf
  | WhileTrue
  | Break
  | Switch
