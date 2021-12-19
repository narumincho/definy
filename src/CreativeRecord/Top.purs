module CreativeRecord.Top
  ( view
  ) where

import Prelude
import Color as Color
import CreativeRecord.Article.Data as ArticleData
import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import CreativeRecord.Article.CpsLabAdventCalendar2021 as CpsLabAdventCalendar2021
import CreativeRecord.Article.PowershellRecursion as PowershellRecursion
import CreativeRecord.StaticResource as StaticResource
import CreativeRecord.SvgImage as SvgImage
import Css as Css
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
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
    [ View.Image
        { path: imageUrl
        , width: View.Percentage 100.0
        , height: 8.0
        , alternativeText: append text "のアイコン"
        }
    , View.text { padding: 0.5 } text
    ]

articleLink :: ArticleTitleAndImageUrl -> View.Element Message.Message Location.Location
articleLink (ArticleTitleAndImageUrl { location, imagePath, title }) =
  View.boxY
    { backgroundColor: linkBackGroundColor
    , link: View.LinkSameOrigin location
    , hover: View.BoxHoverStyle { animation: Just zoomAnimation }
    }
    [ View.Image
        { path: imagePath
        , width: View.Percentage 100.0
        , height: 8.0
        , alternativeText: append (NonEmptyString.toString title) "のイメージ画像"
        }
    , View.text { padding: 0.5 } (NonEmptyString.toString title)
    ]

newtype ArticleTitleAndImageUrl
  = ArticleTitleAndImageUrl
  { imagePath :: StructuredUrl.PathAndSearchParams
  , title :: NonEmptyString
  , location :: Location.Location
  }

articleListToViewElement :: Array ArticleTitleAndImageUrl -> View.Element Message.Message Location.Location
articleListToViewElement list =
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
              (Prelude.map articleLink row)
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
  , articleListToViewElement
      [ ArticleTitleAndImageUrl
          { title: ArticleData.getTitle PowershellRecursion.view
          , imagePath: StaticResource.powershell_iconPng
          , location: Location.Article Location.PowershellRecursion
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "SVGの基本")
          , imagePath: StaticResource.svg_basicPng
          , location: Location.Article Location.SvgBasic
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "単体SVGと埋め込みSVG")
          , imagePath: StaticResource.grape_svg_codePng
          , location: Location.Article Location.SvgStandaloneEmbed
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "DESIRED Routeについて")
          , imagePath: StaticResource.desired_route_titlePng
          , location: Location.Article Location.AboutDesiredRoute
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "メッセージウィンドウの話")
          , imagePath: StaticResource.windowPng
          , location: Location.Article Location.MessageWindow
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "DESIRED RouteとNPIMEのフォントの描画処理")
          , imagePath: StaticResource.fontPng
          , location: Location.Article Location.DesiredRouteFont
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "リストUIのボタン操作の挙動")
          , imagePath: StaticResource.list_uiPng
          , location: Location.Article Location.ListSelectionBehavior
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "UIの配色")
          , imagePath: StaticResource.colorPng
          , location: Location.Article Location.UiColor
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "モンスターとのエンカウントについて")
          , imagePath: StaticResource.battlePng
          , location: Location.Article Location.DesiredRouteEncounter
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "星の図形について")
          , imagePath: StaticResource.starPng
          , location: Location.Article Location.Star
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "DESIRED Routeに登場する予定だった敵モンスター")
          , imagePath: StaticResource.kamausagiPng
          , location: Location.Article Location.DesiredRouteMonster
          }
      , ArticleTitleAndImageUrl
          { title: NonEmptyString.nes (Proxy :: _ "Nプチコン漢字入力(N Petitcom IME)")
          , imagePath: StaticResource.henkanPng
          , location: Location.Article Location.NPetitcomIme
          }
      , ArticleTitleAndImageUrl
          { title: ArticleData.getTitle CpsLabAdventCalendar2021.view
          , imagePath: StaticResource.definy20210811Png
          , location: Location.Article Location.CpsLabAdventCalendar2021
          }
      ]
  ]
