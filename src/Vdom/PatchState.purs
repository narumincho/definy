module Vdom.PatchState
  ( ClickMessageData(..)
  , Events
  , InputEvent
  , MouseEvent
  , PatchState
  , PathAndEvents
  , eventsFrom
  , getClickEventHandler
  , setMessageDataMap
  ) where

import Prelude
import Data.Map as Map
import Data.Maybe (Maybe)
import Data.Nullable (Nullable)
import Data.Nullable as Nullable
import Data.Tuple as Tuple
import Effect (Effect)
import Effect.Uncurried as EffectUncurried
import Vdom.Path as Path

foreign import data MouseEvent :: Type

foreign import data InputEvent :: Type

newtype PathAndEvents message
  = PathAndEvents
  { path :: String
  , events :: Events message
  }

newtype Events message
  = Events
  { onClick :: Nullable (ClickMessageData message)
  , onChange :: Nullable message
  , onInput :: Nullable (String -> message)
  }

eventsFrom ::
  forall message.
  { onClick :: Maybe (ClickMessageData message)
  , onChange :: Maybe message
  , onInput :: Maybe (String -> message)
  } ->
  Events message
eventsFrom rec =
  Events
    { onClick: Nullable.toNullable rec.onClick
    , onChange: Nullable.toNullable rec.onChange
    , onInput: Nullable.toNullable rec.onInput
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
  , setMessageDataMap :: EffectUncurried.EffectFn1 (Array (PathAndEvents message)) Unit
  }

setMessageDataMap :: forall message. PatchState message -> Map.Map Path.Path (Events message) -> Effect Unit
setMessageDataMap (PatchState rec) messageDataMap =
  EffectUncurried.runEffectFn1 rec.setMessageDataMap
    ( map
        ( \(Tuple.Tuple path events) ->
            (PathAndEvents { path: Path.toString path, events })
        )
        (Map.toUnfoldable messageDataMap)
    )

getClickEventHandler :: forall message. PatchState message -> EffectUncurried.EffectFn2 String MouseEvent Unit
getClickEventHandler (PatchState { clickEventHandler }) = clickEventHandler
