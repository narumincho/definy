module VsCodeExtension.Reference
  ( getReference
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Definy.Identifier as Identifier
import Prelude as Prelude
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedTreeIndex as EvaluatedTreeIndex
import VsCodeExtension.Range as Range

getReference ::
  Range.Position ->
  Evaluate.EvaluatedTree ->
  Array Range.Range
getReference position tree = case EvaluatedTreeIndex.getEvaluatedItem position tree of
  Just { item: Evaluate.Expr (Evaluate.ExprPartReference { name }) } ->
    getReferenceInTree
      tree
      name
  Just { item: Evaluate.Identifier (Just name) } ->
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

itemIsMatch :: Evaluate.EvaluatedItem -> Identifier.Identifier -> Boolean
itemIsMatch item identifier = case item of
  Evaluate.Expr (Evaluate.ExprPartReference { name }) -> Prelude.eq name identifier
  Evaluate.Identifier (Just name) -> Prelude.eq name identifier
  _ -> false
