module CreativeRecord.View (view) where

import Color.Scheme.MaterialDesign as Color
import CreativeRecord.Origin as Origin
import CreativeRecord.Top as Top
import Data.Map as Map
import Data.Maybe as Mabye
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import View.View as View

view :: View.View Prelude.Unit
view =
  View.View
    { appName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ナルミンチョの創作記録")
    , box: Top.topBox
    , coverImagePath: StructuredUrl.pathAndSearchParams [ "icon" ] Map.empty
    , description:
        "革新的なプログラミング言語のdefiny, Web技術, 作っているゲームなどについて解説しています"
    , iconPath: StructuredUrl.pathAndSearchParams [ "icon" ] Map.empty
    , language: Mabye.Just Language.Japanese
    , pageName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ナルミンチョの創作記録")
    , path: StructuredUrl.pathAndSearchParams [] Map.empty
    , themeColor: Color.orange
    , style: Maybe.Nothing
    , origin: Origin.origin
    }
