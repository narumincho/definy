module VsCodeExtension.SemanticToken
  ( evaluateTreeToTokenData
  ) where

import Data.Array as Array
import Data.String.CodeUnits as CodeUnits
import Data.UInt as UInt
import Prelude as Prelude
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Range as Range
import VsCodeExtension.TokenType as TokenType

evaluateTreeToTokenData :: Evaluate.EvaluatedTree -> Array TokenType.TokenData
evaluateTreeToTokenData (Evaluate.EvaluatedTree { name, nameRange, item, children }) =
  Array.cons
    ( TokenType.TokenData
        { length: UInt.fromInt (Array.length (CodeUnits.toCharArray name))
        , start: Range.rangeStart nameRange
        , tokenType:
            case item of
              Evaluate.Description _ -> TokenType.TokenTypeString
              Evaluate.Module _ -> TokenType.TokenTypeNamespace
              Evaluate.ModuleBody _ -> TokenType.TokenTypeNamespace
              Evaluate.Part _ -> TokenType.TokenTypeNamespace
              Evaluate.Expr _ -> TokenType.TokenTypeVariable
              Evaluate.UIntLiteral _ -> TokenType.TokenTypeNumber
              Evaluate.Identifier _ -> TokenType.TokenTypeFunction
        }
    )
    (Prelude.bind children (\(Evaluate.EvaluatedTreeChild { child }) -> evaluateTreeToTokenData child))
