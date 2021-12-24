module CreativeRecord.Top
  ( view
  ) where

import Prelude
import Color as Color
import CreativeRecord.Article as Article
import CreativeRecord.Article.Data as ArticleData
import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import CreativeRecord.StaticResource as StaticResource
import CreativeRecord.SvgImage as SvgImage
import Css as Css
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Util as Util
import View.Data as View

linkBackGroundColor :: Color.Color
linkBackGroundColor = Color.fromInt 0x333333

zoomAnimation :: View.Animation
zoomAnimation =
  View.Animation
    { duration: 300.0
    , keyframeList:
        [ Css.Keyframe
            { percentage: 50.0
            , declarationList: [ Css.transformScale 1.05 ]
            }
        ]
    }

snsLink :: StructuredUrl.StructuredUrl -> View.Svg -> String -> View.Element Message.Message Location.Location
snsLink url logo text =
  View.boxX
    { link: View.LinkExternal url
    , paddingLeftRight: 0.5
    , paddingTopBottom: 0.5
    , gap: 0.5
    , backgroundColor: Just linkBackGroundColor
    , hover: View.BoxHoverStyle { animation: Just zoomAnimation }
    }
    [ View.SvgElement
        { width: View.Rem 2.0
        , height: 2.0
        , svg: logo
        , isJustifySelfCenter: false
        }
    , View.text { padding: 0.5 } text
    ]

externalLink :: StructuredUrl.StructuredUrl -> StructuredUrl.PathAndSearchParams -> String -> View.Element Message.Message Location.Location
externalLink url imageUrl text =
  View.boxY
    { link: View.LinkExternal url
    , backgroundColor: linkBackGroundColor
    , hover: View.BoxHoverStyle { animation: Just zoomAnimation }
    }
    [ View.image
        { path: imageUrl
        , width: View.Percentage 100.0
        , height: 8.0
        , alternativeText: append text "のアイコン"
        }
    , View.text { padding: 0.5 } text
    ]

articleLinkView :: Location.ArticleLocation -> View.Element Message.Message Location.Location
articleLinkView articleLocation =
  let
    (ArticleData.Article { title, imagePath }) = Article.articleLocationToArticle articleLocation
  in
    View.boxY
      { backgroundColor: linkBackGroundColor
      , link: View.LinkSameOrigin (Location.Article articleLocation)
      , hover: View.BoxHoverStyle { animation: Just zoomAnimation }
      }
      [ View.image
          { path: imagePath
          , width: View.Percentage 100.0
          , height: 8.0
          , alternativeText: append (NonEmptyString.toString title) "のイメージ画像"
          }
      , View.text { padding: 0.5 } (NonEmptyString.toString title)
      ]

articleListView :: View.Element Message.Message Location.Location
articleListView =
  articleLocationListToViewElement
    [ Location.PowershellRecursion
    , Location.SvgBasic
    , Location.SvgStandaloneEmbed
    , Location.AboutDesiredRoute
    , Location.MessageWindow
    , Location.DesiredRouteFont
    , Location.ListSelectionBehavior
    , Location.UiColor
    , Location.DesiredRouteEncounter
    , Location.Star
    , Location.DesiredRouteMonster
    , Location.NPetitcomIme
    , Location.CpsLabAdventCalendar2021
    ]

articleLocationListToViewElement :: Array Location.ArticleLocation -> View.Element Message.Message Location.Location
articleLocationListToViewElement list =
  View.boxY
    { paddingTopBottom: 0.5
    , paddingLeftRight: 0.5
    , gap: 0.5
    }
    ( Prelude.map
        ( \row ->
            View.boxX
              { gap: 0.5
              , gridTemplateColumns1FrCount: 3
              }
              (Prelude.map articleLinkView row)
        )
        (Util.groupBySize (UInt.fromInt 3) list)
    )

view :: Int -> Array (View.Element Message.Message Location.Location)
view count =
  [ View.text
      { markup: View.Heading2
      , padding: 0.5
      , click: Message.CountUp
      }
      (Prelude.append "ナルミンチョの SNS アカウント" (Prelude.show count))
  , View.boxX
      { paddingTopBottom: 0.5
      , paddingLeftRight: 0.5
      , gap: 0.5
      , height: 4.0
      }
      [ snsLink
          ( StructuredUrl.StructuredUrl
              { origin: NonEmptyString.nes (Proxy :: _ "https://twitter.com")
              , pathAndSearchParams:
                  StructuredUrl.pathAndSearchParams
                    [ NonEmptyString.nes (Proxy :: _ "naru_mincho") ]
                    Map.empty
              }
          )
          SvgImage.twitterLogo
          "@naru_mincho"
      , snsLink
          ( StructuredUrl.StructuredUrl
              { origin: NonEmptyString.nes (Proxy :: _ "https://github.com")
              , pathAndSearchParams:
                  StructuredUrl.pathAndSearchParams
                    [ NonEmptyString.nes (Proxy :: _ "narumincho") ]
                    Map.empty
              }
          )
          SvgImage.gitHubLogo
          "@narumincho"
      , snsLink
          ( StructuredUrl.StructuredUrl
              { origin: NonEmptyString.nes (Proxy :: _ "https://www.youtube.com")
              , pathAndSearchParams:
                  StructuredUrl.pathAndSearchParams
                    [ NonEmptyString.nes (Proxy :: _ "channel")
                    , NonEmptyString.nes (Proxy :: _ "UCDGsMJptdPNN_dbPkTl9qjA")
                    ]
                    Map.empty
              }
          )
          SvgImage.youTubeLogo
          "ナルミンチョ"
      ]
  , View.text
      { markup: View.Heading2
      , padding: 0.5
      }
      "ナルミンチョが作った Webアプリ"
  , View.boxX
      { paddingTopBottom: 0.5
      , paddingLeftRight: 0.5
      , gap: 0.5
      , gridTemplateColumns1FrCount: 3
      }
      [ externalLink
          ( StructuredUrl.StructuredUrl
              { origin: NonEmptyString.nes (Proxy :: _ "https://definy.app")
              , pathAndSearchParams:
                  StructuredUrl.pathAndSearchParams []
                    ( Map.singleton
                        (NonEmptyString.nes (Proxy :: _ "hl"))
                        (NonEmptyString.nes (Proxy :: _ "ja"))
                    )
              }
          )
          StaticResource.definy20210811Png
          "definy"
      , externalLink
          ( StructuredUrl.StructuredUrl
              { origin: NonEmptyString.nes (Proxy :: _ "https://narumincho-creative-record.web.app")
              , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] Map.empty
              }
          )
          StaticResource.gravity_starPng
          "重力星"
      , externalLink
          ( StructuredUrl.StructuredUrl
              { origin: NonEmptyString.nes (Proxy :: _ "https://tsukumart.com")
              , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] Map.empty
              }
          )
          StaticResource.tsukumartPng
          "つくマート"
      ]
  , View.text
      { markup: View.Heading2
      , padding: 0.5
      }
      "ナルミンチョが書いた記事"
  , articleListView
  ]
