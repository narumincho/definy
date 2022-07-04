module VsCodeExtension.EvaluatedItem
  ( EvaluatedItem(..)
  , PartialExpr(..)
  , PartialModule(..)
  , PartialPart(..)
  , findPart
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.UInt as UInt
import Definy.Identifier as Identifier
import Prelude as Prelude
import VsCodeExtension.Range as Range

data EvaluatedItem
  = Module PartialModule
  | Description String
  | ModuleBody (Array PartialPart)
  | Part PartialPart
  | Expr PartialExpr
  | UIntLiteral (Maybe UInt.UInt)
  | Identifier (Maybe Identifier.Identifier)
  | TextLiteral String
  | NonEmptyTextLiteral (Maybe NonEmptyString)
  | Float64Literal (Maybe Number)

newtype PartialModule
  = PartialModule
  { description :: String
  , partList :: Array PartialPart
  }

newtype PartialPart
  = PartialPart
  { name :: Maybe Identifier.Identifier
  , description :: String
  , expr :: Maybe PartialExpr
  , range :: Range.Range
  }

data PartialExpr
  = ExprAdd { a :: Maybe PartialExpr, b :: Maybe PartialExpr }
  | ExprPartReference { name :: Identifier.Identifier }
  | ExprPartReferenceInvalidName { name :: String }
  | ExprUIntLiteral (Maybe UInt.UInt)
  | ExprFloat64Literal (Maybe Number)
  | ExprTextLiteral String
  | ExprNonEmptyTextLiteral (Maybe NonEmptyString)

findPart :: PartialModule -> Identifier.Identifier -> Maybe PartialPart
findPart (PartialModule { partList }) name =
  Array.findMap
    ( \partialPart@(PartialPart { name: partName }) ->
        if Prelude.eq partName (Just name) then
          Just partialPart
        else
          Nothing
    )
    partList
