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
  , builtInTypeToString
  , float64BuiltIn
  , moduleBuiltIn
  , nonEmptyTextBuiltIn
  , partBuiltIn
  , textBuiltIn
  , typeBuiltIn
  , uintBuiltIn
  ) where

import Data.Generic.Rep as GenericRep
import Data.Show.Generic as ShowGeneric
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Prelude as Prelude
import Type.Proxy (Proxy(..))

data BuiltInType
  = Module
  | Description
  | ModuleBody
  | PartDefinition
  | Expr ExprType
  | Identifier
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
  Tuple.Tuple Identifier Identifier -> true
  Tuple.Tuple UIntLiteral UIntLiteral -> true
  Tuple.Tuple TextLiteral TextLiteral -> true
  Tuple.Tuple NonEmptyTextLiteral NonEmptyTextLiteral -> true
  Tuple.Tuple Float64Literal Float64Literal -> true
  Tuple.Tuple _ _ -> false

derive instance genericBuiltInType :: GenericRep.Generic BuiltInType _

instance showBuiltInType :: Prelude.Show BuiltInType where
  show = ShowGeneric.genericShow

builtInTypeToString :: BuiltInType -> String
builtInTypeToString = Prelude.show

data ExprType
  = UInt
  | Text
  | NonEmptyText
  | Float64
  | TypePart
  | TypeBody
  | Unknown

exprTypeMatch :: ExprType -> ExprType -> Boolean
exprTypeMatch expected actual = case Tuple.Tuple expected actual of
  Tuple.Tuple Unknown _ -> true
  Tuple.Tuple UInt UInt -> true
  Tuple.Tuple Text Text -> true
  Tuple.Tuple NonEmptyText NonEmptyText -> true
  Tuple.Tuple Float64 Float64 -> true
  Tuple.Tuple TypeBody TypeBody -> true
  Tuple.Tuple _ _ -> false

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
        InputTypeNormal [ Identifier, Description, Expr TypeBody ]
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
        InputTypeNormal [ Identifier, Description, Expr Unknown ]
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
