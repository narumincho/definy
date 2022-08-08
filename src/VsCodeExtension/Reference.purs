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
      false
      name
  Just { item: EvaluatedItem.Identifier { isUppercase, identifier: Just name } } ->
    getReferenceInTree
      tree
      isUppercase
      name
  _ -> []

getReferenceInTree :: Evaluate.EvaluatedTree -> Boolean -> Identifier.Identifier -> Array Range.Range
getReferenceInTree (Evaluate.EvaluatedTree { children, item, nameRange }) isUppercase identifier =
  if itemIsMatch item isUppercase identifier then
    Array.cons nameRange
      ( Array.concatMap
          ( \(Evaluate.EvaluatedTreeChild { child }) ->
              getReferenceInTree
                child
                isUppercase
                identifier
          )
          children
      )
  else
    ( Array.concatMap
        ( \(Evaluate.EvaluatedTreeChild { child }) ->
            getReferenceInTree
              child
              isUppercase
              identifier
        )
        children
    )

itemIsMatch :: EvaluatedItem.EvaluatedItem -> Boolean -> Identifier.Identifier -> Boolean
itemIsMatch item isUppercase identifier = case item of
  EvaluatedItem.Expr (EvaluatedItem.ExprPartReference { name }) -> Prelude.eq name identifier
  EvaluatedItem.Identifier { isUppercase: evaluatedIsUppercase, identifier: Just name } ->
    Prelude.(&&)
      (Prelude.eq evaluatedIsUppercase isUppercase)
      (Prelude.eq name identifier)
  _ -> false
