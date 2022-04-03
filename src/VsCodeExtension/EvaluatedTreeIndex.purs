module VsCodeExtension.EvaluatedTreeIndex
  ( getEvaluatedItem
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Range as Range

getEvaluatedItem ::
  Range.Position ->
  Evaluate.EvaluatedTree ->
  Maybe { item :: Evaluate.EvaluatedItem, range :: Range.Range }
getEvaluatedItem position (Evaluate.EvaluatedTree { nameRange, item, children }) =
  if Range.isPositionInsideRange nameRange position then
    Just { range: nameRange, item }
  else
    Array.findMap
      ( \(Evaluate.EvaluatedTreeChild { child }) ->
          getEvaluatedItem position child
      )
      children
