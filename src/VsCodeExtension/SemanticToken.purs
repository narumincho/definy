module VsCodeExtension.SemanticToken
  ( evaluateTreeToTokenData
  ) where

import Data.Array as Array
import Prelude as Prelude
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedItem as EvaluatedItem
import VsCodeExtension.Range as Range
import VsCodeExtension.TokenType as TokenType

evaluateTreeToTokenData :: Evaluate.EvaluatedTree -> Array TokenType.TokenData
evaluateTreeToTokenData (Evaluate.EvaluatedTree { nameRange, item, children }) =
  Array.cons
    ( TokenType.TokenData
        { length:
            Prelude.sub
              (Range.positionCharacter (Range.rangeEnd nameRange))
              (Range.positionCharacter (Range.rangeStart nameRange))
        , start: Range.rangeStart nameRange
        , tokenType:
            case item of
              EvaluatedItem.Description _ -> TokenType.TokenTypeString
              EvaluatedItem.Module _ -> TokenType.TokenTypeNamespace
              EvaluatedItem.ModuleBody _ -> TokenType.TokenTypeNamespace
              EvaluatedItem.Part _ -> TokenType.TokenTypeNamespace
              EvaluatedItem.Expr _ -> TokenType.TokenTypeVariable
              EvaluatedItem.UIntLiteral _ -> TokenType.TokenTypeNumber
              EvaluatedItem.TextLiteral _ -> TokenType.TokenTypeString
              EvaluatedItem.NonEmptyTextLiteral _ -> TokenType.TokenTypeString
              EvaluatedItem.Identifier _ -> TokenType.TokenTypeFunction
              EvaluatedItem.Float64Literal _ -> TokenType.TokenTypeNumber
        }
    )
    (Prelude.bind children (\(Evaluate.EvaluatedTreeChild { child }) -> evaluateTreeToTokenData child))
