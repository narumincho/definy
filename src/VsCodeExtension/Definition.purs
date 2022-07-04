module VsCodeExtension.Definition
  ( getDefinitionLocation
  ) where

import Data.Maybe (Maybe(..))
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedItem as EvaluatedItem
import VsCodeExtension.EvaluatedTreeIndex as EvaluatedTreeIndex
import VsCodeExtension.Range as Range

getDefinitionLocation ::
  Range.Position ->
  Evaluate.EvaluatedTree ->
  Maybe Range.Range
getDefinitionLocation position tree@(Evaluate.EvaluatedTree { item }) = case item of
  EvaluatedItem.Module partialModule -> case EvaluatedTreeIndex.getEvaluatedItem position tree of
    Just { item: EvaluatedItem.Expr (EvaluatedItem.ExprPartReference { name }) } -> case EvaluatedItem.findPart partialModule name of
      Just (EvaluatedItem.PartialPart { range: partRange }) -> Just partRange
      Nothing -> Nothing
    _ -> Nothing
  _ -> Nothing
