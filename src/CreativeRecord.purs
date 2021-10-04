module CreativeRecord (view) where

import Html.Data as HtmlData
import Data.Map as Map
import Data.Maybe as Maybe
import StructuredUrl as StructuredUrl
import Language as Language
import Color.Scheme.MaterialDesign as Color

view :: HtmlData.HtmlOption
view =
  ( HtmlData.HtmlOption
      { appName: "ナルミンチョの創作記録"
      , bodyChildren: [ HtmlData.div Map.empty (HtmlData.Text "ちゃんと表示されてるかな?? <ok>") ]
      , bodyClass: Maybe.Nothing
      , coverImagePath: StructuredUrl.pathAndSearchParams [] Map.empty
      , description: "革新的なプログラミング言語のdefiny, Web技術, 作っているゲームなどについて解説しています"
      , iconPath: StructuredUrl.pathAndSearchParams [ "icon" ] Map.empty
      , language: Maybe.Just Language.Japanese
      , origin: "http://localhost:1234"
      , pageName: "ナルミンチョの創作記録"
      , path: Maybe.Just (StructuredUrl.pathAndSearchParams [] Map.empty)
      , scriptPath: Maybe.Just (StructuredUrl.pathAndSearchParams [ "program" ] Map.empty)
      , style: Maybe.Nothing
      , stylePath: Maybe.Nothing
      , themeColor: Color.red
      , twitterCard: HtmlData.SummaryCardWithLargeImage
      }
  )
