module VsCodeExtension.SemanticToken
  ( evaluateTreeToTokenData
  ) where

import Data.Array as Array
import Prelude as Prelude
import VsCodeExtension.Evaluate as Evaluate
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
              Evaluate.Description _ -> TokenType.TokenTypeString
              Evaluate.Module _ -> TokenType.TokenTypeNamespace
              Evaluate.ModuleBody _ -> TokenType.TokenTypeNamespace
              Evaluate.Part _ -> TokenType.TokenTypeNamespace
              Evaluate.Expr _ -> TokenType.TokenTypeVariable
              Evaluate.UIntLiteral _ -> TokenType.TokenTypeNumber
              Evaluate.TextLiteral _ -> TokenType.TokenTypeString
              Evaluate.NonEmptyTextLiteral _ -> TokenType.TokenTypeString
              Evaluate.Identifier _ -> TokenType.TokenTypeFunction
              Evaluate.Float64Literal _ -> TokenType.TokenTypeNumber
        }
    )
    (Prelude.bind children (\(Evaluate.EvaluatedTreeChild { child }) -> evaluateTreeToTokenData child))
