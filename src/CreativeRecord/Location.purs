module CreativeRecord.Location (Location(..), toUrl, fromPath) where

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
        MessageWindow ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "message-window")
          ]
        DesiredRouteFont ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "desired-route-font")
          ]
        ListSelectionBehavior ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "list-selection-behavior")
          ]
        UiColor ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "ui-color")
          ]
        DesiredRouteEncounter ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "desired-route-encounter")
          ]
        Star ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "star")
          ]
        DesiredRouteMonster ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "desired-route-monster")
          ]
        NPetitcomIme ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "n-petitcom-ime")
          ]
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
