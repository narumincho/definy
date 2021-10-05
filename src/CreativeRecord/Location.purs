module CreativeRecord.Location (Location(..), toPath, toUrl) where

import Data.Map as Map
import Out as Out
import StructuredUrl as StructuredUrl

data Location
  = Top
  | PowershellRecursion
  | SvgBasic
  | SvgStandaloneEmbed
  | AboutDesiredRoute
  | MessageWindow
  | DesiredRouteFont
  | ListSelectionBehavior
  | UiColor
  | DesiredRouteEncounter
  | Star
  | DesiredRouteMonster
  | NPetitcomIme

toUrl :: Location -> StructuredUrl.StructuredUrl
toUrl location =
  StructuredUrl.StructuredUrl
    { origin: Out.origin, pathAndSearchParams: (toPath location) }

toPath :: Location -> StructuredUrl.PathAndSearchParams
toPath location =
  StructuredUrl.pathAndSearchParams
    ( case location of
        Top -> []
        PowershellRecursion -> [ "powershell-recursion" ]
        SvgBasic -> [ "svg-basic" ]
        SvgStandaloneEmbed -> [ "svg-standalone-embed" ]
        AboutDesiredRoute -> [ "about-desired-route" ]
        MessageWindow -> [ "message-window" ]
        DesiredRouteFont -> [ "desired-route-font" ]
        ListSelectionBehavior -> [ "list-selection-behavior" ]
        UiColor -> [ "ui-color" ]
        DesiredRouteEncounter -> [ "desired-route-encounter" ]
        Star -> [ "star" ]
        DesiredRouteMonster -> [ "desired-route-monster" ]
        NPetitcomIme -> [ "n-petitcom-ime" ]
    )
    (Map.empty)
