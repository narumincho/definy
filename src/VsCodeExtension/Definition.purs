module VsCodeExtension.Definition
  ( getDefinitionLocation
  ) where

import Data.Maybe (Maybe(..))
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedTreeIndex as EvaluatedTreeIndex
import VsCodeExtension.Range as Range

getDefinitionLocation ::
  Range.Position ->
  Evaluate.EvaluatedTree ->
  Maybe Range.Range
getDefinitionLocation position tree@(Evaluate.EvaluatedTree { item }) = case item of
  Evaluate.Module partialModule -> case EvaluatedTreeIndex.getEvaluatedItem position tree of
    Just { item: Evaluate.Expr (Evaluate.ExprPartReference { name }) } -> case Evaluate.findPart partialModule name of
      Just (Evaluate.PartialPart { range: partRange }) -> Just partRange
      Nothing -> Nothing
    _ -> Nothing
  _ -> Nothing
