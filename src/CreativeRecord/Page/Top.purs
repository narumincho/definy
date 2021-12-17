module CreativeRecord.Page.Top
  ( ArticleTitleAndImageUrl(..)
  , articleLink
  , articleListToViewElement
  , copyright
  , externalLink
  , linkBackGroundColor
  , snsLink
  , view
  , zoomAnimation
  ) where

import Prelude
import Color as Color
import CreativeRecord.Article as Article
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
import Type.Proxy as Proxy
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
    , paddingLeftRight: 8.0
    , paddingTopBottom: 8.0
    , gap: 8.0
    , backgroundColor: Just linkBackGroundColor
    , hover: View.BoxHoverStyle { animation: Just zoomAnimation }
    }
    [ View.SvgElement
        { width: View.Rem 2.0
        , height: 2.0
        , svg: logo
        , isJustifySelfCenter: false
        }
    , View.text { padding: 8.0 } text
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
    , View.text { padding: 8.0 } text
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
        , alternativeText: append title "のイメージ画像"
        }
    , View.text { padding: 8.0 } title
    ]

newtype ArticleTitleAndImageUrl
  = ArticleTitleAndImageUrl
  { imagePath :: StructuredUrl.PathAndSearchParams
  , title :: String
  , location :: Location.Location
  }

articleListToViewElement :: Array ArticleTitleAndImageUrl -> View.Element Message.Message Location.Location
articleListToViewElement list =
  View.boxY
    { paddingTopBottom: 8.0
    , paddingLeftRight: 8.0
    , gap: 8.0
    }
    ( Prelude.map
        ( \row ->
            View.boxX
              { gap: 8.0
              , gridTemplateColumns1FrCount: 3
              }
              (Prelude.map articleLink row)
        )
        (Util.groupBySize (UInt.fromInt 3) list)
    )

copyright :: View.Element Message.Message Location.Location
copyright =
  View.text
    { padding: 8.0 }
    "© 2021 narumincho"

view :: Int -> Article.Article
view count = Article.Article { title: Nothing, children: [ child count ] }

child :: Int -> View.Element Message.Message Location.Location
child count =
  View.boxY
    {}
    [ View.text
        { markup: View.Heading2
        , padding: 8.0
        , click: Message.CountUp
        }
        (Prelude.append "ナルミンチョの SNS アカウント" (Prelude.show count))
    , View.boxX
        { paddingTopBottom: 8.0
        , paddingLeftRight: 8.0
        , gap: 8.0
        , height: 4.0
        }
        [ snsLink
            ( StructuredUrl.StructuredUrl
                { origin: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://twitter.com")
                , pathAndSearchParams: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "naru_mincho") ] Map.empty
                }
            )
            SvgImage.twitterLogo
            "@naru_mincho"
        , snsLink
            ( StructuredUrl.StructuredUrl
                { origin: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://github.com")
                , pathAndSearchParams: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "narumincho") ] Map.empty
                }
            )
            SvgImage.gitHubLogo
            "@narumincho"
        , snsLink
            ( StructuredUrl.StructuredUrl
                { origin: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://www.youtube.com")
                , pathAndSearchParams:
                    StructuredUrl.pathAndSearchParams
                      [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "channel")
                      , NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "UCDGsMJptdPNN_dbPkTl9qjA")
                      ]
                      Map.empty
                }
            )
            SvgImage.youTubeLogo
            "ナルミンチョ"
        ]
    , View.text
        { markup: View.Heading2
        , padding: 8.0
        }
        "ナルミンチョが作った Webアプリ"
    , View.boxX
        { paddingTopBottom: 8.0
        , paddingLeftRight: 8.0
        , gap: 8.0
        , gridTemplateColumns1FrCount: 3
        }
        [ externalLink
            ( StructuredUrl.StructuredUrl
                { origin: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://definy.app")
                , pathAndSearchParams:
                    StructuredUrl.pathAndSearchParams []
                      ( Map.singleton
                          (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "hl"))
                          (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ja"))
                      )
                }
            )
            StaticResource.definy20210811Png
            "definy"
        , externalLink
            ( StructuredUrl.StructuredUrl
                { origin: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://narumincho-creative-record.web.app")
                , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] Map.empty
                }
            )
            StaticResource.gravity_starPng
            "重力星"
        , externalLink
            ( StructuredUrl.StructuredUrl
                { origin: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://tsukumart.com")
                , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] Map.empty
                }
            )
            StaticResource.tsukumartPng
            "つくマート"
        ]
    , View.text
        { markup: View.Heading2
        , padding: 8.0
        }
        "ナルミンチョが書いた 記事"
    , articleListToViewElement
        [ ArticleTitleAndImageUrl
            { title:
                "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する"
            , imagePath: StaticResource.powershell_iconPng
            , location: Location.PowershellRecursion
            }
        , ArticleTitleAndImageUrl
            { title: "SVGの基本"
            , imagePath: StaticResource.svg_basicPng
            , location: Location.SvgBasic
            }
        , ArticleTitleAndImageUrl
            { title: "単体SVGと埋め込みSVG"
            , imagePath: StaticResource.grape_svg_codePng
            , location: Location.SvgStandaloneEmbed
            }
        , ArticleTitleAndImageUrl
            { title: "DESIRED Routeについて"
            , imagePath: StaticResource.desired_route_titlePng
            , location: Location.AboutDesiredRoute
            }
        , ArticleTitleAndImageUrl
            { title: "メッセージウィンドウの話"
            , imagePath: StaticResource.windowPng
            , location: Location.MessageWindow
            }
        , ArticleTitleAndImageUrl
            { title: "DESIRED RouteとNPIMEのフォントの描画処理"
            , imagePath: StaticResource.fontPng
            , location: Location.DesiredRouteFont
            }
        , ArticleTitleAndImageUrl
            { title: "リストUIのボタン操作の挙動"
            , imagePath: StaticResource.list_uiPng
            , location: Location.ListSelectionBehavior
            }
        , ArticleTitleAndImageUrl
            { title: "UIの配色"
            , imagePath: StaticResource.colorPng
            , location: Location.UiColor
            }
        , ArticleTitleAndImageUrl
            { title: "モンスターとのエンカウントについて"
            , imagePath: StaticResource.battlePng
            , location: Location.DesiredRouteEncounter
            }
        , ArticleTitleAndImageUrl
            { title: "星の図形について"
            , imagePath: StaticResource.starPng
            , location: Location.Star
            }
        , ArticleTitleAndImageUrl
            { title: "DESIRED Routeに登場する予定だった敵モンスター"
            , imagePath: StaticResource.kamausagiPng
            , location: Location.DesiredRouteMonster
            }
        , ArticleTitleAndImageUrl
            { title: "Nプチコン漢字入力(N Petitcom IME)"
            , imagePath: StaticResource.henkanPng
            , location: Location.NPetitcomIme
            }
        , ArticleTitleAndImageUrl
            { title: "型システムと協力して世界を構築する"
            , imagePath: StaticResource.definy20210811Png
            , location: Location.CpsLabAdventCalendar2021
            }
        ]
    , copyright
    ]
