module CreativeRecord.Location
  ( Location(..)
  , fromPath
  , toPath
  , toUrl
  ) where

import Prelude
import CreativeRecord.Origin as Origin
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy

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
    { origin: Origin.origin, pathAndSearchParams: toPath location }

toPath :: Location -> StructuredUrl.PathAndSearchParams
toPath location =
  StructuredUrl.pathAndSearchParams
    ( case location of
        Top -> []
        PowershellRecursion -> [ powershellRecursionPath ]
        SvgBasic -> [ svgBasicPath ]
        SvgStandaloneEmbed -> [ svgStandaloneEmbedPath ]
        AboutDesiredRoute -> [ aboutDesiredRoutePath ]
        MessageWindow -> [ messageWindowPath ]
        DesiredRouteFont -> [ desiredRouteFontPath ]
        ListSelectionBehavior -> [ listSelectionBehaviorPath ]
        UiColor -> [ uiColorPath ]
        DesiredRouteEncounter -> [ desiredRouteEncounterPath ]
        Star -> [ starPath ]
        DesiredRouteMonster -> [ desiredRouteMonster ]
        NPetitcomIme -> [ nPetitcomIme ]
    )
    Map.empty

fromPath :: StructuredUrl.PathAndSearchParams -> Maybe Location
fromPath (StructuredUrl.PathAndSearchParams { path }) = case path of
  [] -> Just Top
  [ name ] ->
    if eq name powershellRecursionPath then
      Just PowershellRecursion
    else if eq name svgBasicPath then
      Just SvgBasic
    else if eq name svgStandaloneEmbedPath then
      Just SvgStandaloneEmbed
    else if eq name aboutDesiredRoutePath then
      Just AboutDesiredRoute
    else if eq name messageWindowPath then
      Just MessageWindow
    else if eq name desiredRouteFontPath then
      Just DesiredRouteFont
    else if eq name listSelectionBehaviorPath then
      Just ListSelectionBehavior
    else if eq name uiColorPath then
      Just UiColor
    else if eq name desiredRouteEncounterPath then
      Just DesiredRouteEncounter
    else if eq name starPath then
      Just Star
    else if eq name desiredRouteMonster then
      Just DesiredRouteMonster
    else if eq name nPetitcomIme then
      Just NPetitcomIme
    else
      Nothing
  _ -> Nothing

powershellRecursionPath :: NonEmptyString
powershellRecursionPath =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "powershell-recursion")

svgBasicPath :: NonEmptyString
svgBasicPath =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "svg-basic")

svgStandaloneEmbedPath :: NonEmptyString
svgStandaloneEmbedPath =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "svg-standalone-embed")

aboutDesiredRoutePath :: NonEmptyString
aboutDesiredRoutePath =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "about-desired-route")

messageWindowPath :: NonEmptyString
messageWindowPath =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "message-window")

desiredRouteFontPath :: NonEmptyString
desiredRouteFontPath =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "desired-route-font")

listSelectionBehaviorPath :: NonEmptyString
listSelectionBehaviorPath =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "list-selection-behavior")

uiColorPath :: NonEmptyString
uiColorPath =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "ui-color")

desiredRouteEncounterPath :: NonEmptyString
desiredRouteEncounterPath =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "desired-route-encounter")

starPath :: NonEmptyString
starPath =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "star")

desiredRouteMonster :: NonEmptyString
desiredRouteMonster =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "desired-route-monster")

nPetitcomIme :: NonEmptyString
nPetitcomIme =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "n-petitcom-ime")
