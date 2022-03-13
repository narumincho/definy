module VsCodeExtension.SemanticToken
  ( evaluateTreeToTokenData
  ) where

import Prelude as Prelude
import Data.Array as Array
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.TokenType as TokenType
import Data.UInt as UInt
import Data.String.NonEmpty.CodeUnits as NonEmptyCodeUnits
import VsCodeExtension.Range as Range

evaluateTreeToTokenData :: Evaluate.EvaluatedTree -> Array TokenType.TokenData
evaluateTreeToTokenData (Evaluate.EvaluatedTree { name, nameRange, item, children }) =
  Array.cons
    ( TokenType.TokenData
        { length: UInt.fromInt (Array.length (NonEmptyCodeUnits.toCharArray name))
        , start: Range.rangeStart nameRange
        , tokenType:
            case item of
              Evaluate.Description _ -> TokenType.TokenTypeString
              Evaluate.Module _ -> TokenType.TokenTypeNamespace
              Evaluate.ModuleBody _ -> TokenType.TokenTypeNamespace
              Evaluate.Part _ -> TokenType.TokenTypeNamespace
              Evaluate.Expr _ -> TokenType.TokenTypeVariable
              Evaluate.UIntLiteral _ -> TokenType.TokenTypeNumber
              Evaluate.Unknown -> TokenType.TokenTypeVariable
        }
    )
    (Prelude.bind children evaluateTreeToTokenData)
