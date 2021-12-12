module View.App
  ( App(..)
  , StateAndMessageList(..)
  , startApp
  ) where

import Prelude
import Data.Function.Uncurried as Uncurried
import Data.Maybe (Maybe(..))
import Effect (Effect)
import Effect.Uncurried as EffectUncurried
import Vdom.PatchState as VdomPatchState
import Vdom.Render as VdomRender
import View.Data as Data
import View.ToVdom as ToVdom

newtype StateAndMessageList :: Type -> Type -> Type
newtype StateAndMessageList state message
  = StateAndMessageList
  { state :: state
  , messageList :: Array message
  }

type ClientStartOption state message view
  = { initStateAndMessageList :: StateAndMessageList state message
    , stateToView :: state -> view
    , renderView :: EffectUncurried.EffectFn2 view (VdomPatchState.PatchState message) Unit
    , update :: Uncurried.Fn2 message state state
    , urlChangeMessageData :: String -> message
    }

foreign import clientStart :: forall state message view. EffectUncurried.EffectFn1 (ClientStartOption state message view) Unit

-- | Webアプリを表現する
newtype App state message
  = App
  { initStateAndMessageList :: StateAndMessageList state message
  , update :: message -> state -> state
  , stateToView :: state -> Data.View message
  , urlChangeMessageData :: String -> message
  }

startApp :: forall state message. App state message -> Effect Unit
startApp (App rec) =
  EffectUncurried.runEffectFn1 clientStart
    { initStateAndMessageList: rec.initStateAndMessageList
    , stateToView: rec.stateToView
    , renderView: renderView
    , update: Uncurried.mkFn2 rec.update
    , urlChangeMessageData: rec.urlChangeMessageData
    }

renderView :: forall message. EffectUncurried.EffectFn2 (Data.View message) (VdomPatchState.PatchState message) Unit
renderView =
  EffectUncurried.mkEffectFn2
    ( \view patchState ->
        VdomRender.resetAndRender
          (ToVdom.toVdom Nothing view)
          patchState
    )
