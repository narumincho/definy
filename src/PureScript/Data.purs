module PureScript.Data
  ( Module(..)
  , Definition(..)
  , ModuleName(..)
  , TypeData(..)
  , ExprData(..)
  , moduleNameAsStringNonEmptyArray
  ) where

import Data.Array.NonEmpty as NonEmptyArray
import Data.String.NonEmpty (NonEmptyString)
import Prelude as Prelude

newtype Module
  = Module
  { name :: ModuleName
  , definitionList :: Array Definition
  }

newtype Definition
  = Definition
  { name :: NonEmptyString
  , document :: String
  , typeData :: TypeData
  , exprData :: ExprData
  , isExport :: Boolean
  }

newtype ModuleName
  = ModuleName (NonEmptyArray.NonEmptyArray NonEmptyString)

derive instance moduleNameEq :: Prelude.Eq ModuleName

derive instance moduleNameOrd :: Prelude.Ord ModuleName

data TypeData
  = TypeData
    { moduleName :: ModuleName
    , name :: NonEmptyString
    }
  | SymbolLiteral String
  | TypeWithArgument { function :: TypeData, argument :: TypeData }

data ExprData
  = Call { function :: ExprData, argument :: ExprData }
  | Variable { moduleName :: ModuleName, name :: NonEmptyString }
  | StringLiteral String
  | CharLiteral Char
  | ArrayLiteral (Array ExprData)
  | TypeAnnotation { expr :: ExprData, pType :: TypeData }
  | Tag { moduleName :: ModuleName, name :: NonEmptyString }

moduleNameAsStringNonEmptyArray :: Module -> NonEmptyArray.NonEmptyArray NonEmptyString
moduleNameAsStringNonEmptyArray (Module { name: ModuleName name }) = name
