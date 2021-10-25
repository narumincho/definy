module CreativeRecord.Location (Location(..), toUrl) where

import CreativeRecord.Origin as Origin
import Data.Map as Map
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
        PowershellRecursion ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "powershell-recursion")
          ]
        SvgBasic ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "svg-basic")
          ]
        SvgStandaloneEmbed ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "svg-standalone-embed")
          ]
        AboutDesiredRoute ->
          [ NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "about-desired-route")
          ]
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
