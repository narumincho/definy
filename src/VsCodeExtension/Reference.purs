module VsCodeExtension.Reference
  ( getReference
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Definy.Identifier as Identifier
import Prelude as Prelude
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedItem as EvaluatedItem
import VsCodeExtension.EvaluatedTreeIndex as EvaluatedTreeIndex
import VsCodeExtension.Range as Range

getReference ::
  Range.Position ->
  Evaluate.EvaluatedTree ->
  Array Range.Range
getReference position tree = case EvaluatedTreeIndex.getEvaluatedItem position tree of
  Just { item: EvaluatedItem.Expr (EvaluatedItem.ExprPartReference { name }) } ->
    getReferenceInTree
      tree
      name
  Just { item: EvaluatedItem.Identifier (Just name) } ->
    getReferenceInTree
      tree
      name
  _ -> []

getReferenceInTree :: Evaluate.EvaluatedTree -> Identifier.Identifier -> Array Range.Range
getReferenceInTree (Evaluate.EvaluatedTree { children, item, nameRange }) identifier =
  if itemIsMatch item identifier then
    Array.cons nameRange
      ( Array.concatMap
          (\(Evaluate.EvaluatedTreeChild { child }) -> getReferenceInTree child identifier)
          children
      )
  else
    ( Array.concatMap
        (\(Evaluate.EvaluatedTreeChild { child }) -> getReferenceInTree child identifier)
        children
    )

itemIsMatch :: EvaluatedItem.EvaluatedItem -> Identifier.Identifier -> Boolean
itemIsMatch item identifier = case item of
  EvaluatedItem.Expr (EvaluatedItem.ExprPartReference { name }) -> Prelude.eq name identifier
  EvaluatedItem.Identifier (Just name) -> Prelude.eq name identifier
  _ -> false
