module VsCodeExtension.Hover
  ( getHoverData
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.UInt as UInt
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.LanguageServerLib as Lib
import VsCodeExtension.Range as Range

getHoverData :: Range.Position -> Evaluate.EvaluatedTree -> Maybe Lib.Hover
getHoverData position (Evaluate.EvaluatedTree { nameRange, range, item, children }) =
  if Range.isPositionInsideRange nameRange position then
    Just
      ( Lib.Hover
          { contents:
              Lib.MarkupContent
                { kind: Lib.Markdown
                , value: evaluatedItemToHoverText item
                }
          , range: range
          }
      )
  else
    Array.findMap (getHoverData position) children

evaluatedItemToHoverText :: Evaluate.EvaluatedItem -> String
evaluatedItemToHoverText = case _ of
  Evaluate.Module _ -> "Module(..)"
  Evaluate.Description description -> String.joinWith "" [ "Description(", description, ")" ]
  Evaluate.ModuleBody _ -> "ModuleBody(..)"
  Evaluate.Part _ -> "Part(..)"
  Evaluate.Expr value ->
    String.joinWith ""
      ( Array.concat
          [ [ "Expr(" ]
          , case value of
              Just v -> [ "Just(", UInt.toString v, ")" ]
              Nothing -> [ "Nothing" ]
          , [ ")" ]
          ]
      )
  Evaluate.UIntLiteral uintLiteral ->
    String.joinWith ""
      ( Array.concat
          [ [ "UIntLiteral(" ]
          , case uintLiteral of
              Just v -> [ "Just(", UInt.toString v, ")" ]
              Nothing -> [ "Nothing" ]
          , [ ")" ]
          ]
      )
  Evaluate.Unknown -> "Unknown"
