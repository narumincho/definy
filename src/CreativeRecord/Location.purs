module CreativeRecord.Location
  ( ArticleLocation(..)
  , Location(..)
  , fromPath
  , toPath
  , toUrl
  ) where

import Prelude
import CreativeRecord.Origin as Origin
import Data.Map as Map
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy

data Location
  = Top
  | Article ArticleLocation

data ArticleLocation
  = PowershellRecursion
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
  | CpsLabAdventCalendar2021
  | NotFound StructuredUrl.PathAndSearchParams

toUrl :: Location -> StructuredUrl.StructuredUrl
toUrl location =
  StructuredUrl.StructuredUrl
    { origin: Origin.origin, pathAndSearchParams: toPath location }

toPath :: Location -> StructuredUrl.PathAndSearchParams
toPath = case _ of
  Top -> StructuredUrl.pathAndSearchParams [] Map.empty
  Article PowershellRecursion -> StructuredUrl.pathAndSearchParams [ powershellRecursionPath ] Map.empty
  Article SvgBasic -> StructuredUrl.pathAndSearchParams [ svgBasicPath ] Map.empty
  Article SvgStandaloneEmbed -> StructuredUrl.pathAndSearchParams [ svgStandaloneEmbedPath ] Map.empty
  Article AboutDesiredRoute -> StructuredUrl.pathAndSearchParams [ aboutDesiredRoutePath ] Map.empty
  Article MessageWindow -> StructuredUrl.pathAndSearchParams [ messageWindowPath ] Map.empty
  Article DesiredRouteFont -> StructuredUrl.pathAndSearchParams [ desiredRouteFontPath ] Map.empty
  Article ListSelectionBehavior -> StructuredUrl.pathAndSearchParams [ listSelectionBehaviorPath ] Map.empty
  Article UiColor -> StructuredUrl.pathAndSearchParams [ uiColorPath ] Map.empty
  Article DesiredRouteEncounter -> StructuredUrl.pathAndSearchParams [ desiredRouteEncounterPath ] Map.empty
  Article Star -> StructuredUrl.pathAndSearchParams [ starPath ] Map.empty
  Article DesiredRouteMonster -> StructuredUrl.pathAndSearchParams [ desiredRouteMonster ] Map.empty
  Article NPetitcomIme -> StructuredUrl.pathAndSearchParams [ nPetitcomIme ] Map.empty
  Article CpsLabAdventCalendar2021 ->
    StructuredUrl.pathAndSearchParams
      [ cpsLabAdventCalendar2021Path ]
      Map.empty
  Article (NotFound path) -> path

fromPath :: StructuredUrl.PathAndSearchParams -> Location
fromPath (pathAndSearchParams@(StructuredUrl.PathAndSearchParams { path })) = case path of
  [] -> Top
  _ -> Article (articleLocationFromPath pathAndSearchParams)

articleLocationFromPath :: StructuredUrl.PathAndSearchParams -> ArticleLocation
articleLocationFromPath (StructuredUrl.PathAndSearchParams { path, searchParams }) = case path of
  [ name ] ->
    if eq name powershellRecursionPath then
      PowershellRecursion
    else if eq name svgBasicPath then
      SvgBasic
    else if eq name svgStandaloneEmbedPath then
      SvgStandaloneEmbed
    else if eq name aboutDesiredRoutePath then
      AboutDesiredRoute
    else if eq name messageWindowPath then
      MessageWindow
    else if eq name desiredRouteFontPath then
      DesiredRouteFont
    else if eq name listSelectionBehaviorPath then
      ListSelectionBehavior
    else if eq name uiColorPath then
      UiColor
    else if eq name desiredRouteEncounterPath then
      DesiredRouteEncounter
    else if eq name starPath then
      Star
    else if eq name desiredRouteMonster then
      DesiredRouteMonster
    else if eq name nPetitcomIme then
      NPetitcomIme
    else if eq name cpsLabAdventCalendar2021Path then
      CpsLabAdventCalendar2021
    else
      NotFound (StructuredUrl.PathAndSearchParams { path, searchParams })
  _ -> NotFound (StructuredUrl.PathAndSearchParams { path, searchParams })

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

cpsLabAdventCalendar2021Path :: NonEmptyString
cpsLabAdventCalendar2021Path =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "cps-lab-advent-calendar-2021")
