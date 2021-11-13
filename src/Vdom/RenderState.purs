module Vdom.RenderState (RenderState, empty) where

data RenderState :: Type -> Type
data RenderState message
  = RenderState

empty :: forall a. RenderState a
empty = RenderState
