module VsCodeExtension.BuiltIn
  ( BuiltIn(..)
  , BuiltInType(..)
  , ExprType(..)
  , InputType(..)
  , addBuiltIn
  , all
  , bodyBuiltIn
  , buildInGetDescription
  , buildInGetInputType
  , buildInGetOutputType
  , builtInGetName
  , builtInTypeMatch
  , builtInTypeToNoPositionTree
  , float64BuiltIn
  , moduleBuiltIn
  , nonEmptyTextBuiltIn
  , partBuiltIn
  , patternBuiltIn
  , textBuiltIn
  , typeBodySumBuiltIn
  , typeBuiltIn
  , typeDefaultValue
  , uintBuiltIn
  ) where

import Data.Generic.Rep as GenericRep
import Data.Show.Generic as ShowGeneric
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import VsCodeExtension.NoPositionTree as NoPositionTree

data BuiltInType
  = Module
  | Description
  | ModuleBody
  | PartDefinition
  | Expr ExprType
  | Identifier Boolean
  | UIntLiteral
  | TextLiteral
  | NonEmptyTextLiteral
  | Float64Literal

builtInTypeMatch :: BuiltInType -> BuiltInType -> Boolean
builtInTypeMatch expected actual = case Tuple.Tuple expected actual of
  Tuple.Tuple Module Module -> true
  Tuple.Tuple Description Description -> true
  Tuple.Tuple ModuleBody ModuleBody -> true
  Tuple.Tuple PartDefinition PartDefinition -> true
  Tuple.Tuple (Expr expectedExprType) (Expr actualExprType) -> exprTypeMatch expectedExprType actualExprType
  Tuple.Tuple (Identifier true) (Identifier true) -> true
  Tuple.Tuple (Identifier false) (Identifier false) -> true
  Tuple.Tuple UIntLiteral UIntLiteral -> true
  Tuple.Tuple TextLiteral TextLiteral -> true
  Tuple.Tuple NonEmptyTextLiteral NonEmptyTextLiteral -> true
  Tuple.Tuple Float64Literal Float64Literal -> true
  Tuple.Tuple _ _ -> false

derive instance genericBuiltInType :: GenericRep.Generic BuiltInType _

builtInTypeToNoPositionTree :: BuiltInType -> NoPositionTree.NoPositionTree
builtInTypeToNoPositionTree = case _ of
  Module -> NoPositionTree.noPositionTreeEmptyChildren "Module"
  Description -> NoPositionTree.noPositionTreeEmptyChildren "Description"
  ModuleBody -> NoPositionTree.noPositionTreeEmptyChildren "ModuleBody"
  PartDefinition -> NoPositionTree.noPositionTreeEmptyChildren "PartDefinition"
  Expr expr ->
    NoPositionTree.NoPositionTree
      { name: "Expr"
      , children: [ NoPositionTree.noPositionTreeEmptyChildren (Prelude.show expr) ]
      }
  Identifier isUppercase ->
    NoPositionTree.NoPositionTree
      { name: "Identifier"
      , children: [ NoPositionTree.noPositionTreeEmptyChildren (Prelude.show isUppercase) ]
      }
  UIntLiteral -> NoPositionTree.noPositionTreeEmptyChildren "UIntLiteral"
  TextLiteral -> NoPositionTree.noPositionTreeEmptyChildren "TextLiteral"
  NonEmptyTextLiteral -> NoPositionTree.noPositionTreeEmptyChildren "NonEmptyTextLiteral"
  Float64Literal -> NoPositionTree.noPositionTreeEmptyChildren "Float64Literal"

typeDefaultValue :: BuiltInType -> NoPositionTree.NoPositionTree
typeDefaultValue = case _ of
  Module -> builtInToDefaultNoPositionTree moduleBuiltIn
  Description ->
    NoPositionTree.NoPositionTree
      { name: "description", children: [] }
  ModuleBody -> builtInToDefaultNoPositionTree bodyBuiltIn
  PartDefinition -> builtInToDefaultNoPositionTree partBuiltIn
  Expr UInt -> builtInToDefaultNoPositionTree uintBuiltIn
  Expr Float64 -> builtInToDefaultNoPositionTree float64BuiltIn
  Expr Text -> builtInToDefaultNoPositionTree textBuiltIn
  Expr NonEmptyText -> builtInToDefaultNoPositionTree nonEmptyTextBuiltIn
  Expr TypePart -> builtInToDefaultNoPositionTree typeBuiltIn
  Expr TypeBody -> builtInToDefaultNoPositionTree typeBodySumBuiltIn
  Expr Pattern -> builtInToDefaultNoPositionTree patternBuiltIn
  Expr Unknown -> builtInToDefaultNoPositionTree uintBuiltIn
  UIntLiteral ->
    NoPositionTree.NoPositionTree
      { name: "28", children: [] }
  TextLiteral ->
    NoPositionTree.NoPositionTree
      { name: "sample text", children: [] }
  NonEmptyTextLiteral ->
    NoPositionTree.NoPositionTree
      { name: "sample text", children: [] }
  Float64Literal ->
    NoPositionTree.NoPositionTree
      { name: "6.28", children: [] }
  Identifier true ->
    NoPositionTree.NoPositionTree
      { name: "Sample", children: [] }
  Identifier false ->
    NoPositionTree.NoPositionTree
      { name: "sample", children: [] }

builtInToDefaultNoPositionTree :: BuiltIn -> NoPositionTree.NoPositionTree
builtInToDefaultNoPositionTree builtIn =
  NoPositionTree.NoPositionTree
    { name: NonEmptyString.toString (builtInGetName builtIn)
    , children:
        inputTypeToDefaultValue (buildInGetInputType builtIn)
    }

inputTypeToDefaultValue :: InputType -> Array NoPositionTree.NoPositionTree
inputTypeToDefaultValue = case _ of
  InputTypeNormal typeList -> Prelude.map typeDefaultValue typeList
  InputTypeRepeat builtInType ->
    [ typeDefaultValue builtInType
    , typeDefaultValue builtInType
    , typeDefaultValue builtInType
    ]

data ExprType
  = UInt
  | Text
  | NonEmptyText
  | Float64
  | TypePart
  | TypeBody
  | Pattern
  | Unknown

exprTypeMatch :: ExprType -> ExprType -> Boolean
exprTypeMatch expected actual = case expected of
  Unknown -> true
  _ -> Prelude.eq expected actual

derive instance eqExprType :: Prelude.Eq ExprType

derive instance genericExprType :: GenericRep.Generic ExprType _

instance showExprType :: Prelude.Show ExprType where
  show = ShowGeneric.genericShow

newtype BuiltIn
  = BuiltIn
  { name :: NonEmptyString
  , description :: NonEmptyString
  , outputType :: BuiltInType
  , inputType :: InputType
  }

data InputType
  = InputTypeNormal (Array BuiltInType)
  | InputTypeRepeat BuiltInType

builtInGetName :: BuiltIn -> NonEmptyString
builtInGetName (BuiltIn { name }) = name

buildInGetDescription :: BuiltIn -> NonEmptyString
buildInGetDescription (BuiltIn { description }) = description

buildInGetOutputType :: BuiltIn -> BuiltInType
buildInGetOutputType (BuiltIn { outputType }) = outputType

buildInGetInputType :: BuiltIn -> InputType
buildInGetInputType (BuiltIn { inputType }) = inputType

all :: Array BuiltIn
all =
  [ moduleBuiltIn
  , bodyBuiltIn
  , typeBuiltIn
  , partBuiltIn
  , addBuiltIn
  , uintBuiltIn
  , textBuiltIn
  , nonEmptyTextBuiltIn
  , float64BuiltIn
  , typeBodySumBuiltIn
  , patternBuiltIn
  ]

moduleBuiltIn :: BuiltIn
moduleBuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "module")
    , description: NonEmptyString.nes (Proxy :: Proxy "複数のパーツと説明文を合わせたまとまり")
    , inputType:
        InputTypeNormal
          [ Description
          , ModuleBody
          ]
    , outputType: Module
    }

bodyBuiltIn :: BuiltIn
bodyBuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "body")
    , description: NonEmptyString.nes (Proxy :: Proxy "複数のパーツを合わせたまとまり")
    , inputType: InputTypeRepeat PartDefinition
    , outputType: ModuleBody
    }

typeBuiltIn :: BuiltIn
typeBuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "type")
    , description:
        NonEmptyString.nes
          (Proxy :: Proxy "型を定義する")
    , inputType:
        InputTypeNormal [ Identifier true, Description, Expr TypeBody ]
    , outputType: PartDefinition
    }

partBuiltIn :: BuiltIn
partBuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "part")
    , description:
        NonEmptyString.nes
          (Proxy :: Proxy "パーツの定義 パーツはあらゆるデータに名前を付けて使えるようにしたもの")
    , inputType:
        InputTypeNormal [ Identifier false, Description, Expr Unknown ]
    , outputType: PartDefinition
    }

addBuiltIn :: BuiltIn
addBuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "add")
    , description:
        NonEmptyString.nes (Proxy :: Proxy "UInt 同士の足し算")
    , inputType:
        InputTypeNormal [ Expr UInt, Expr UInt ]
    , outputType: Expr UInt
    }

uintBuiltIn :: BuiltIn
uintBuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "uint")
    , description: NonEmptyString.nes (Proxy :: Proxy "自然数リテラル")
    , inputType: InputTypeNormal [ UIntLiteral ]
    , outputType: Expr UInt
    }

textBuiltIn :: BuiltIn
textBuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "text")
    , description: NonEmptyString.nes (Proxy :: Proxy "文字列リテラル")
    , inputType: InputTypeNormal [ TextLiteral ]
    , outputType: Expr Text
    }

nonEmptyTextBuiltIn :: BuiltIn
nonEmptyTextBuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "nonEmptyText")
    , description: NonEmptyString.nes (Proxy :: Proxy "空ではない文字列リテラル")
    , inputType: InputTypeNormal [ NonEmptyTextLiteral ]
    , outputType: Expr NonEmptyText
    }

float64BuiltIn :: BuiltIn
float64BuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "float64")
    , description: NonEmptyString.nes (Proxy :: Proxy "64bit 浮動小数点数リテラル")
    , inputType: InputTypeNormal [ Float64Literal ]
    , outputType: Expr Float64
    }

typeBodySumBuiltIn :: BuiltIn
typeBodySumBuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "typeBodySum")
    , description:
        NonEmptyString.nes
          (Proxy :: Proxy "直和型. A か B か C. のように同時に入らない型を作る. enum に近いが, パラメーターを指定することができる")
    , inputType: InputTypeRepeat (Expr Pattern)
    , outputType: Expr TypeBody
    }

patternBuiltIn :: BuiltIn
patternBuiltIn =
  BuiltIn
    { name: NonEmptyString.nes (Proxy :: Proxy "pattern")
    , description: NonEmptyString.nes (Proxy :: Proxy "直和型のパターン. パラメーターはあとで対応")
    , inputType: InputTypeNormal [ Identifier false, Description ]
    , outputType: Expr Pattern
    }
