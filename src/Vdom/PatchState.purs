module Vdom.PatchState
  ( PatchState
  , MouseEvent
  , InputEvent
  , PathAndEvents
  ) where

import Prelude
import Data.Nullable (Nullable)
import Effect.Uncurried as EffectUncurried

foreign import data MouseEvent :: Type

foreign import data InputEvent :: Type

newtype PathAndEvents message
  = PathAndEvents
  { path :: String
  , events :: Events message
  }

type Events message
  = { onClick :: Nullable (ClickMessageData message)
    , onChange :: Nullable message
    , onInput :: Nullable (String -> message)
    }

type ClickMessageData :: Type -> Type
type ClickMessageData message
  = { ignoreNewTab :: Boolean
    , stopPropagation :: Boolean
    , message :: message
    }

type PatchState message
  = { clickEventHandler :: EffectUncurried.EffectFn2 String MouseEvent Unit
    , changeEventHandler :: EffectUncurried.EffectFn1 String Unit
    , inputEventHandler :: EffectUncurried.EffectFn2 String InputEvent Unit
    , setMessageDataMap :: EffectUncurried.EffectFn1 (Array (PathAndEvents message)) Unit
    }
