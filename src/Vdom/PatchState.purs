module Vdom.PatchState
  ( ClickMessageData(..)
  , InputEvent
  , MouseEvent
  , NewMessageMapParameter(..)
  , PatchState
  , getClickEventHandler
  , newMessageMapParameterAddClick
  , newMessageMapParameterEmpty
  , newMessageMapParameterUnions
  , setMessageDataMap
  ) where

import Prelude
import Data.Map as Map
import Data.Tuple as Tuple
import Effect (Effect)
import Effect.Uncurried as EffectUncurried
import Vdom.Path as Path

foreign import data MouseEvent :: Type

foreign import data InputEvent :: Type

newtype NewMessageMap message
  = NewMessageMap
  { click :: Array (PathAndMessageData (ClickMessageData message))
  , change :: Array (PathAndMessageData message)
  , input :: Array (PathAndMessageData (String -> message))
  }

newtype PathAndMessageData messageData
  = PathAndMessageData
  { path :: String
  , messageData :: messageData
  }

newtype ClickMessageData :: Type -> Type
newtype ClickMessageData message
  = ClickMessageData
  { stopPropagation :: Boolean
  , message :: message
  }

newtype PatchState message
  = PatchState
  { clickEventHandler :: EffectUncurried.EffectFn2 String MouseEvent Unit
  , changeEventHandler :: EffectUncurried.EffectFn1 String Unit
  , inputEventHandler :: EffectUncurried.EffectFn2 String InputEvent Unit
  , setMessageDataMap :: EffectUncurried.EffectFn1 (NewMessageMap message) Unit
  }

newtype NewMessageMapParameter message
  = NewMessageMapParameter
  { click :: Map.Map Path.Path (ClickMessageData message)
  , change :: Map.Map Path.Path message
  , input :: Map.Map Path.Path (String -> message)
  }

setMessageDataMap :: forall message. PatchState message -> NewMessageMapParameter message -> Effect Unit
setMessageDataMap (PatchState rec) (NewMessageMapParameter messageDataMap) =
  EffectUncurried.runEffectFn1 rec.setMessageDataMap
    ( NewMessageMap
        { click:
            map
              ( \(Tuple.Tuple path messageData) ->
                  ( PathAndMessageData
                      { path: Path.toString path
                      , messageData
                      }
                  )
              )
              (Map.toUnfoldable messageDataMap.click)
        , change:
            map
              ( \(Tuple.Tuple path messageData) ->
                  ( PathAndMessageData
                      { path: Path.toString path
                      , messageData
                      }
                  )
              )
              (Map.toUnfoldable messageDataMap.change)
        , input:
            map
              ( \(Tuple.Tuple path messageData) ->
                  ( PathAndMessageData
                      { path: Path.toString path
                      , messageData
                      }
                  )
              )
              (Map.toUnfoldable messageDataMap.input)
        }
    )

newMessageMapParameterAddClick :: forall message. Path.Path -> ClickMessageData message -> NewMessageMapParameter message -> NewMessageMapParameter message
newMessageMapParameterAddClick path clickMessageData (NewMessageMapParameter rec) =
  NewMessageMapParameter
    (rec { click = Map.insert path clickMessageData rec.click })

newMessageMapParameterUnions :: forall message. Array (NewMessageMapParameter message) -> NewMessageMapParameter message
newMessageMapParameterUnions list =
  NewMessageMapParameter
    { click:
        Map.unions
          ( map
              (\(NewMessageMapParameter { click }) -> click)
              list
          )
    , change:
        Map.unions
          ( map
              (\(NewMessageMapParameter { change }) -> change)
              list
          )
    , input:
        Map.unions
          ( map
              (\(NewMessageMapParameter { input }) -> input)
              list
          )
    }

newMessageMapParameterEmpty :: forall message. NewMessageMapParameter message
newMessageMapParameterEmpty =
  NewMessageMapParameter
    { click: Map.empty
    , change: Map.empty
    , input: Map.empty
    }

getClickEventHandler :: forall message. PatchState message -> EffectUncurried.EffectFn2 String MouseEvent Unit
getClickEventHandler (PatchState { clickEventHandler }) = clickEventHandler
