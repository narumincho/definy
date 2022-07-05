module VsCodeExtension.Definition
  ( getDefinitionLocation
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Definy.Identifier as Identifier
import Prelude as Prelude
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedItem as EvaluatedItem
import VsCodeExtension.EvaluatedTreeIndex as EvaluatedTreeIndex
import VsCodeExtension.Range as Range

getDefinitionLocation ::
  Range.Position ->
  Evaluate.EvaluatedTree ->
  Maybe Range.Range
getDefinitionLocation position tree = case EvaluatedTreeIndex.getEvaluatedItem position tree of
  Just { item: EvaluatedItem.Expr (EvaluatedItem.ExprPartReference { name }) } -> findPart name tree
  _ -> Nothing

findPart ::
  Identifier.Identifier ->
  Evaluate.EvaluatedTree ->
  Maybe Range.Range
findPart targetName (Evaluate.EvaluatedTree { item, range, children }) = case item of
  EvaluatedItem.Part (EvaluatedItem.PartialPart { name }) ->
    if Prelude.eq name (Just targetName) then
      Just range
    else
      Array.findMap
        (findPart targetName)
        (Prelude.map (\(Evaluate.EvaluatedTreeChild { child }) -> child) children)
  _ ->
    Array.findMap
      (findPart targetName)
      (Prelude.map (\(Evaluate.EvaluatedTreeChild { child }) -> child) children)
