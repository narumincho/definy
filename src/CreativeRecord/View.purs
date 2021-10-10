module CreativeRecord.View (view) where

import Color.Scheme.MaterialDesign as Color
import Data.Map as Map
import Data.Maybe as Mabye
import Data.Maybe as Maybe
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import CreativeRecord.Top as Top
import View.View as View

view :: View.View Prelude.Unit
view =
  View.View
    { appName: "ナルミンチョの創作記録"
    , box: Top.topBox
    , coverImagePath: StructuredUrl.pathAndSearchParams [ "icon" ] Map.empty
    , description:
        "革新的なプログラミング言語のdefiny, Web技術, 作っているゲームなどについて解説しています"
    , iconPath: StructuredUrl.pathAndSearchParams [ "icon" ] Map.empty
    , language: Mabye.Just Language.Japanese
    , pageName: "ナルミンチョの創作記録"
    , path: StructuredUrl.pathAndSearchParams [] Map.empty
    , themeColor: Color.orange
    , style: Maybe.Nothing
    , origin: "http://localhost:1234"
    }
