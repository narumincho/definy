module CreativeRecord.View (view) where

import Color.Scheme.MaterialDesign as Color
import CreativeRecord.Article as Article
import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import CreativeRecord.Origin as Origin
import CreativeRecord.Page.NotFound as NotFound
import CreativeRecord.Page.PowershellRecursion as PowershellRecursion
import CreativeRecord.Page.Top as Top
import CreativeRecord.Page.Wip as Wip
import CreativeRecord.Page.CpsLabAdventCalendar2021 as CpsLabAdventCalendar2021
import CreativeRecord.State as State
import CreativeRecord.StaticResource as StaticResource
import CreativeRecord.SvgImage as SvgImage
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import View.Data as View

view :: State.State -> View.View Message.Message Location.Location
view state =
  articleToView
    ( case State.getLocation state of
        Location.Top -> Top.view (State.getCount state)
        Location.PowershellRecursion -> PowershellRecursion.view
        Location.CpsLabAdventCalendar2021 -> CpsLabAdventCalendar2021.view
        Location.NotFound _ -> NotFound.view
        _ -> Wip.view
    )

articleToView :: Article.Article -> View.View Message.Message Location.Location
articleToView (Article.Article { title, children }) =
  View.View
    { appName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ナルミンチョの創作記録")
    , children:
        Array.concat
          [ [ View.boxY
                { link: View.LinkSameOrigin Location.Top
                , paddingTopBottom: 48.0
                }
                [ View.SvgElement
                    { width: View.Percentage 90.0
                    , height: 5.0
                    , isJustifySelfCenter: true
                    , svg: SvgImage.webSiteLogo
                    }
                ]
            ]
          , children
          ]
    , coverImagePath: StaticResource.iconPng
    , description:
        "革新的なプログラミング言語のdefiny, Web技術, 作っているゲームなどについて解説しています"
    , iconPath: StaticResource.iconPng
    , language: Maybe.Just Language.Japanese
    , pageName:
        NonEmptyString.prependString
          ( case title of
              Just titleText ->
                NonEmptyString.toString
                  (NonEmptyString.appendString titleText " | ")
              Nothing -> ""
          )
          (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ナルミンチョの創作記録"))
    , path: StructuredUrl.pathAndSearchParams [] Map.empty
    , themeColor: Color.orange
    , origin: Origin.origin
    }
