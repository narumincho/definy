module VsCodeExtension.EvaluatedItem
  ( EvaluatedItem(..)
  , PartialExpr(..)
  , PartialModule(..)
  , PartialPart(..)
  , PartialType(..)
  , findPart
  , toBuiltInType
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.UInt as UInt
import Definy.Identifier as Identifier
import Prelude as Prelude
import VsCodeExtension.BuiltIn as BuiltIn

data EvaluatedItem
  = Module PartialModule
  | Description String
  | ModuleBody (Array PartialPart)
  | Part PartialPart
  | Type PartialType
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
  }

newtype PartialType
  = PartialType
  { name :: Maybe Identifier.Identifier
  , description :: String
  , expr :: Maybe PartialExpr
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

toBuiltInType :: EvaluatedItem -> BuiltIn.BuiltInType
toBuiltInType = case _ of
  Module _ -> BuiltIn.Module
  Description _ -> BuiltIn.Description
  ModuleBody _ -> BuiltIn.ModuleBody
  Part _ -> BuiltIn.PartDefinition
  Type _ -> BuiltIn.PartDefinition
  Expr (ExprAdd _) -> BuiltIn.Expr BuiltIn.UInt
  Expr (ExprPartReference _) -> BuiltIn.Expr BuiltIn.Unknown
  Expr (ExprPartReferenceInvalidName _) -> BuiltIn.Expr BuiltIn.Unknown
  Expr (ExprUIntLiteral _) -> BuiltIn.Expr BuiltIn.UInt
  Expr (ExprFloat64Literal _) -> BuiltIn.Expr BuiltIn.Float64
  Expr (ExprTextLiteral _) -> BuiltIn.Expr BuiltIn.Text
  Expr (ExprNonEmptyTextLiteral _) -> BuiltIn.Expr BuiltIn.NonEmptyText
  UIntLiteral _ -> BuiltIn.UIntLiteral
  Identifier _ -> BuiltIn.Identifier
  TextLiteral _ -> BuiltIn.TextLiteral
  NonEmptyTextLiteral _ -> BuiltIn.NonEmptyTextLiteral
  Float64Literal _ -> BuiltIn.Float64Literal
