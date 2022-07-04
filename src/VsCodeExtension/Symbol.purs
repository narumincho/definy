module VsCodeExtension.Symbol where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Definy.Identifier as Identifier
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedItem as EvaluatedItem
import VsCodeExtension.Range as Range

getSymbolAndRangeList ::
  Evaluate.EvaluatedTree -> Array { name :: NonEmptyString, range :: Range.Range }
getSymbolAndRangeList = case _ of
  (Evaluate.EvaluatedTree { item: EvaluatedItem.Module (EvaluatedItem.PartialModule { partList }) }) ->
    Array.mapMaybe
      ( \(EvaluatedItem.PartialPart { name, range }) -> case name of
          Just identifier ->
            Just
              { name: Identifier.identifierToNonEmptyString identifier
              , range
              }
          Nothing -> Nothing
      )
      partList
  _ -> []
