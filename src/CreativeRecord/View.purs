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
import Css as Css
import Data.Array as Array
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import View.Data as View
import View.Helper as ViewHelper

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
                [ [ ViewHelper.boxY
                      { link: View.LinkSameOrigin Location.Top
                      , paddingTopBottom: 3.0
                      }
                      [ ViewHelper.svg
                          { width: ViewHelper.Percentage 90.0
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
          , bodyStyle: View.createStyle {} [ Css.overflow { x: Css.Hidden, y: Css.Scroll } ]
          }
      Location.Article articleLocation ->
        articleToView
          articleLocation
          (Article.articleLocationToArticle articleLocation)

articleToView :: Location.ArticleLocation -> ArticleData.Article -> View.View Message.Message Location.Location
articleToView location (ArticleData.Article { title, imagePath, children }) =
  View.View
    { appName: NonEmptyString.nes (Proxy :: _ "ナルミンチョの創作記録")
    , children:
        Array.concat
          [ [ ViewHelper.boxY
                { link: View.LinkSameOrigin Location.Top
                , paddingTopBottom: 3.0
                }
                [ ViewHelper.svg
                    { width: ViewHelper.Percentage 90.0
                    , height: 5.0
                    , isJustifySelfCenter: true
                    , svg: SvgImage.webSiteLogo
                    }
                ]
            , ViewHelper.text
                { markup: View.Heading2
                , padding: 0.5
                }
                (NonEmptyString.toString title)
            , ViewHelper.image
                { alternativeText: ""
                , height: 10.0
                , path: imagePath
                , width: ViewHelper.Percentage 100.0
                , objectFit: Css.Contain
                }
            ]
          , children
          , [ backToTop, copyright ]
          ]
    , coverImagePath: imagePath
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
    , bodyStyle: View.createStyle {} [ Css.overflow { x: Css.Hidden, y: Css.Scroll } ]
    }

backToTop :: View.Element Message.Message Location.Location
backToTop =
  ViewHelper.boxX
    {}
    [ ViewHelper.boxX
        { paddingLeftRight: 0.5
        , paddingTopBottom: 0.5
        , link: View.LinkSameOrigin Location.Top
        }
        [ ViewHelper.text {} "ホームに戻る" ]
    ]

copyright :: View.Element Message.Message Location.Location
copyright =
  ViewHelper.text
    { padding: 0.5 }
    "© 2021 narumincho"
