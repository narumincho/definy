module CreativeRecord.View (view) where

import Color.Scheme.MaterialDesign as Color
import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import CreativeRecord.Origin as Origin
import CreativeRecord.Page.NotFound as NotFound
import CreativeRecord.Page.PowershellRecursion as PowershellRecursion
import CreativeRecord.Page.Top as Top
import CreativeRecord.Page.Wip as Wip
import CreativeRecord.State as State
import CreativeRecord.StaticResource as StaticResource
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import View.Data as ViewData

view :: State.State -> ViewData.View Message.Message Location.Location
view state =
  ViewData.View
    { appName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ナルミンチョの創作記録")
    , children:
        [ case State.getLocation state of
            Location.Top -> Top.topBox (State.getCount state)
            Location.PowershellRecursion -> PowershellRecursion.view
            Location.NotFound _ -> NotFound.view
            _ -> Wip.view
        ]
    , coverImagePath: StaticResource.iconPng
    , description:
        "革新的なプログラミング言語のdefiny, Web技術, 作っているゲームなどについて解説しています"
    , iconPath: StaticResource.iconPng
    , language: Maybe.Just Language.Japanese
    , pageName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ナルミンチョの創作記録")
    , path: StructuredUrl.pathAndSearchParams [] Map.empty
    , themeColor: Color.orange
    , origin: Origin.origin
    }
