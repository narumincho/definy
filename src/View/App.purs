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
import StructuredUrl as StructuredUrl
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
    , urlChangeMessageData ::
        { path :: String, searchParams :: String } ->
        message
    }

foreign import clientStart ::
  forall state message view.
  EffectUncurried.EffectFn1 (ClientStartOption state message view) Unit

-- | Webアプリを表現する
newtype App state message location
  = App
  { initStateAndMessageList :: StateAndMessageList state message
  , update :: message -> state -> state
  , stateToView :: state -> Data.View message location
  , urlChangeMessageData :: location -> message
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  , pathAndSearchParamsToLocation :: StructuredUrl.PathAndSearchParams -> location
  }

startApp :: forall state message location. App state message location -> Effect Unit
startApp (App rec) =
  EffectUncurried.runEffectFn1 clientStart
    { initStateAndMessageList: rec.initStateAndMessageList
    , stateToView: rec.stateToView
    , renderView:
        renderView
          { locationToPathAndSearchParams: rec.locationToPathAndSearchParams
          , urlChangeMessageData: rec.urlChangeMessageData
          }
    , update: Uncurried.mkFn2 rec.update
    , urlChangeMessageData:
        ( \pathAndSearchParams ->
            rec.urlChangeMessageData
              ( rec.pathAndSearchParamsToLocation
                  ( StructuredUrl.locationPathAndSearchParamsToPathAndSearchParams
                      pathAndSearchParams
                  )
              )
        )
    }

renderView ::
  forall message location.
  { locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  , urlChangeMessageData :: location -> message
  } ->
  EffectUncurried.EffectFn2
    (Data.View message location)
    (VdomPatchState.PatchState message)
    Unit
renderView { locationToPathAndSearchParams, urlChangeMessageData } =
  EffectUncurried.mkEffectFn2
    ( \view patchState ->
        VdomRender.resetAndRender
          { vdom: ToVdom.toVdom { scriptPath: Nothing, view }
          , patchState
          , locationToPathAndSearchParams
          , urlChangeMessageData
          }
    )
