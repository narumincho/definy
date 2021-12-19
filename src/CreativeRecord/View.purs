module CreativeRecord.View (view) where

import Color.Scheme.MaterialDesign as Color
import CreativeRecord.Article as Article
import CreativeRecord.Article.Data as ArticleData
import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import CreativeRecord.Origin as Origin
import CreativeRecord.State as State
import CreativeRecord.StaticResource as StaticResource
import CreativeRecord.SvgImage as SvgImage
import CreativeRecord.Top as Top
import Data.Array as Array
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import View.Data as View

appName :: NonEmptyString
appName = NonEmptyString.nes (Proxy :: _ "ナルミンチョの創作記録")

view :: State.State -> View.View Message.Message Location.Location
view state =
  let
    location :: Location.Location
    location = State.getLocation state
  in
    case location of
      Location.Top ->
        View.View
          { appName
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
                , Top.view (State.getCount state)
                , [ copyright ]
                ]
          , coverImagePath: StaticResource.iconPng
          , description:
              "革新的なプログラミング言語のdefiny, Web技術, 作っているゲームなどについて解説しています"
          , iconPath: StaticResource.iconPng
          , language: Maybe.Just Language.Japanese
          , pageName: appName
          , path: Location.toPath location
          , themeColor: Color.orange
          , origin: Origin.origin
          , scrollX: true
          , scrollY: true
          }
      Location.Article articleLocation ->
        articleToView
          articleLocation
          (Article.locationToArticleOrTop articleLocation)

articleToView :: Location.ArticleLocation -> ArticleData.Article -> View.View Message.Message Location.Location
articleToView location (ArticleData.Article { title, children }) =
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
        Prelude.append
          (NonEmptyString.appendString title " | ")
          appName
    , path: Location.toPath (Location.Article location)
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
