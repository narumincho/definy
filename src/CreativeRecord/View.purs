module CreativeRecord.View (view) where

import Color.Scheme.MaterialDesign as Color
import CreativeRecord.Location as Location
import CreativeRecord.Origin as Origin
import CreativeRecord.Page.NotFound as NotFound
import CreativeRecord.Page.PowershellRecursion as PowershellRecursion
import CreativeRecord.Page.Top as Top
import CreativeRecord.Page.Wip as Wip
import CreativeRecord.StaticResource as StaticResource
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import View.Data as ViewData

view :: Maybe Location.Location -> ViewData.View Prelude.Unit
view location =
  ViewData.View
    { appName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ナルミンチョの創作記録")
    , children:
        [ case location of
            Just Location.Top -> Top.topBox
            Just Location.PowershellRecursion -> PowershellRecursion.view
            Just _ -> Wip.view
            Nothing -> NotFound.view
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
