module CreativeRecord.View (view) where

import Color.Scheme.MaterialDesign as Color
import CreativeRecord.Article as Article
import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import CreativeRecord.Origin as Origin
import CreativeRecord.Page.CpsLabAdventCalendar2021 as CpsLabAdventCalendar2021
import CreativeRecord.Page.NotFound as NotFound
import CreativeRecord.Page.PowershellRecursion as PowershellRecursion
import CreativeRecord.Page.Top as Top
import CreativeRecord.Page.Wip as Wip
import CreativeRecord.State as State
import CreativeRecord.StaticResource as StaticResource
import CreativeRecord.SvgImage as SvgImage
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import Type.Proxy (Proxy(..))
import View.Data as View

view :: State.State -> View.View Message.Message Location.Location
view state =
  let
    location :: Location.Location
    location = State.getLocation state
  in
    articleToView
      location
      ( case location of
          Location.Top -> Top.view (State.getCount state)
          Location.PowershellRecursion -> Article.toArticleOrTop PowershellRecursion.view
          Location.CpsLabAdventCalendar2021 -> Article.toArticleOrTop CpsLabAdventCalendar2021.view
          Location.NotFound _ -> Article.toArticleOrTop NotFound.view
          _ -> Article.toArticleOrTop Wip.view
      )

articleToView :: Location.Location -> Article.ArticleOrTop -> View.View Message.Message Location.Location
articleToView location (Article.ArticleOrTop { title, children }) =
  View.View
    { appName: NonEmptyString.nes (Proxy :: _ "ナルミンチョの創作記録")
    , children:
        Array.concat
          [ [ View.boxY
                { link: View.LinkSameOrigin Location.Top
                , paddingTopBottom: 3.0
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
          , [ backToTop, copyright ]
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
          (NonEmptyString.nes (Proxy :: _ "ナルミンチョの創作記録"))
    , path: Location.toPath location
    , themeColor: Color.orange
    , origin: Origin.origin
    , scrollX: true
    , scrollY: true
    }

backToTop :: View.Element Message.Message Location.Location
backToTop =
  View.boxX
    {}
    [ View.boxX
        { paddingLeftRight: 0.5
        , paddingTopBottom: 0.5
        , link: View.LinkSameOrigin Location.Top
        }
        [ View.text {} "ホームに戻る" ]
    ]

copyright :: View.Element Message.Message Location.Location
copyright =
  View.text
    { padding: 0.5 }
    "© 2021 narumincho"
