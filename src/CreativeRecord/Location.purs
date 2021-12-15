module CreativeRecord.Location
  ( Location(..)
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
  | NotFound StructuredUrl.PathAndSearchParams

toUrl :: Location -> StructuredUrl.StructuredUrl
toUrl location =
  StructuredUrl.StructuredUrl
    { origin: Origin.origin, pathAndSearchParams: toPath location }

toPath :: Location -> StructuredUrl.PathAndSearchParams
toPath = case _ of
  Top -> StructuredUrl.pathAndSearchParams [] Map.empty
  PowershellRecursion -> StructuredUrl.pathAndSearchParams [ powershellRecursionPath ] Map.empty
  SvgBasic -> StructuredUrl.pathAndSearchParams [ svgBasicPath ] Map.empty
  SvgStandaloneEmbed -> StructuredUrl.pathAndSearchParams [ svgStandaloneEmbedPath ] Map.empty
  AboutDesiredRoute -> StructuredUrl.pathAndSearchParams [ aboutDesiredRoutePath ] Map.empty
  MessageWindow -> StructuredUrl.pathAndSearchParams [ messageWindowPath ] Map.empty
  DesiredRouteFont -> StructuredUrl.pathAndSearchParams [ desiredRouteFontPath ] Map.empty
  ListSelectionBehavior -> StructuredUrl.pathAndSearchParams [ listSelectionBehaviorPath ] Map.empty
  UiColor -> StructuredUrl.pathAndSearchParams [ uiColorPath ] Map.empty
  DesiredRouteEncounter -> StructuredUrl.pathAndSearchParams [ desiredRouteEncounterPath ] Map.empty
  Star -> StructuredUrl.pathAndSearchParams [ starPath ] Map.empty
  DesiredRouteMonster -> StructuredUrl.pathAndSearchParams [ desiredRouteMonster ] Map.empty
  NPetitcomIme -> StructuredUrl.pathAndSearchParams [ nPetitcomIme ] Map.empty
  NotFound path -> path

fromPath :: StructuredUrl.PathAndSearchParams -> Location
fromPath (StructuredUrl.PathAndSearchParams { path, searchParams }) = case path of
  [] -> Top
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
