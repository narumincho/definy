module PureScript.Data
  ( Module(..)
  , Definition(..)
  , ModuleName(..)
  , PType(..)
  , Expr(..)
  , moduleNameAsStringNonEmptyArray
  ) where

import Prelude as Prelude
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe as Maybe

newtype Module
  = Module
  { name :: ModuleName
  , definitionList :: Array Definition
  }

newtype Definition
  = Definition
  { name :: String
  , document :: String
  , pType :: PType
  , expr :: Expr
  , isExport :: Boolean
  }

newtype ModuleName
  = ModuleName (NonEmptyArray.NonEmptyArray String)

derive instance moduleNameEq :: Prelude.Eq ModuleName

derive instance moduleNameOrd :: Prelude.Ord ModuleName

newtype PType
  = PType { moduleName :: ModuleName, name :: String, argument :: Maybe.Maybe PType }

data Expr
  = Expr { moduleName :: ModuleName, name :: String, argument :: Maybe.Maybe Expr }
  | StringLiteral String

moduleNameAsStringNonEmptyArray :: Module -> NonEmptyArray.NonEmptyArray String
moduleNameAsStringNonEmptyArray (Module { name: ModuleName name }) = name
