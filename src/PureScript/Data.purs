module PureScript.Data
  ( Module(..)
  , Definition(..)
  , ModuleName(..)
  , PType(..)
  , Expr(..)
  , ExprData(..)
  , moduleNameAsStringNonEmptyArray
  ) where

import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude

newtype Module
  = Module
  { name :: ModuleName
  , definitionList :: Array Definition
  }

newtype Definition
  = Definition
  { name :: NonEmptyString.NonEmptyString
  , document :: String
  , pType :: PType
  , expr :: ExprData
  , isExport :: Boolean
  }

newtype ModuleName
  = ModuleName (NonEmptyArray.NonEmptyArray NonEmptyString.NonEmptyString)

derive instance moduleNameEq :: Prelude.Eq ModuleName

derive instance moduleNameOrd :: Prelude.Ord ModuleName

data PType
  = PType
    { moduleName :: ModuleName
    , name :: NonEmptyString.NonEmptyString
    , argument :: Maybe.Maybe PType
    }
  | SymbolLiteral String

data Expr :: Type -> Type
data Expr pType
  = Expr ExprData

data ExprData
  = Call { function :: ExprData, arguments :: NonEmptyArray.NonEmptyArray ExprData }
  | Variable { moduleName :: ModuleName, name :: NonEmptyString.NonEmptyString }
  | StringLiteral String
  | CharLiteral Char
  | ArrayLiteral (Array ExprData)
  | TypeAnnotation { expr :: ExprData, pType :: PType }

moduleNameAsStringNonEmptyArray :: Module -> NonEmptyArray.NonEmptyArray NonEmptyString.NonEmptyString
moduleNameAsStringNonEmptyArray (Module { name: ModuleName name }) = name
