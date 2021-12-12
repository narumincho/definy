module CreativeRecord.Page.Top where

import Prelude
import Color as Color
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

snsLink :: StructuredUrl.StructuredUrl -> View.Svg -> String -> View.Element Message.Message
snsLink url logo text =
  View.box
    { direction: View.X
    , link: Just (View.LinkExternal url)
    , paddingLeftRight: 8.0
    , paddingTopBottom: 8.0
    , gap: 8.0
    , height: Nothing
    , backgroundColor: Just linkBackGroundColor
    , hover: View.BoxHoverStyle { animation: Just zoomAnimation }
    , gridTemplateColumns1FrCount: Nothing
    , children:
        [ View.SvgElement { width: View.Rem 2.0, height: 2.0, svg: logo, isJustifySelfCenter: false }
        , View.text { markup: View.None, padding: 8.0, text, click: Nothing }
        ]
    }

externalLink :: StructuredUrl.StructuredUrl -> StructuredUrl.PathAndSearchParams -> String -> View.Element Message.Message
externalLink url imageUrl text =
  View.box
    { direction: View.Y
    , link: Just (View.LinkExternal url)
    , backgroundColor: Just linkBackGroundColor
    , hover: View.BoxHoverStyle { animation: Just zoomAnimation }
    , gap: 0.0
    , paddingTopBottom: 0.0
    , paddingLeftRight: 0.0
    , height: Nothing
    , gridTemplateColumns1FrCount: Nothing
    , children:
        [ View.Image
            { path: imageUrl
            , width: View.Percentage 100.0
            , height: 8.0
            , alternativeText: append text "のアイコン"
            }
        , View.text { markup: View.None, padding: 8.0, text, click: Nothing }
        ]
    }

articleLink :: ArticleTitleAndImageUrl -> View.Element Message.Message
articleLink (ArticleTitleAndImageUrl { location, imagePath, title }) =
  View.box
    { direction: View.Y
    , backgroundColor: Just linkBackGroundColor
    , link:
        Just
          ( View.linkSameOrigin
              (Message.ChangeLocation (Just location))
              (Location.toPath location)
          )
    , hover: View.BoxHoverStyle { animation: Just zoomAnimation }
    , children:
        [ View.Image
            { path: imagePath
            , width: View.Percentage 100.0
            , height: 8.0
            , alternativeText: append title "のイメージ画像"
            }
        , View.text { markup: View.None, padding: 8.0, text: title, click: Nothing }
        ]
    , gap: 0.0
    , paddingTopBottom: 0.0
    , paddingLeftRight: 0.0
    , height: Nothing
    , gridTemplateColumns1FrCount: Nothing
    }

newtype ArticleTitleAndImageUrl
  = ArticleTitleAndImageUrl
  { imagePath :: StructuredUrl.PathAndSearchParams
  , title :: String
  , location :: Location.Location
  }

articleListToViewElement :: Array ArticleTitleAndImageUrl -> View.Element Message.Message
articleListToViewElement list =
  View.box
    { direction: View.Y
    , paddingTopBottom: 8.0
    , paddingLeftRight: 8.0
    , gap: 8.0
    , children:
        Prelude.map
          ( \row ->
              View.box
                { direction: View.X
                , gap: 8.0
                , gridTemplateColumns1FrCount: Just 3
                , children: Prelude.map articleLink row
                , paddingTopBottom: 0.0
                , paddingLeftRight: 0.0
                , height: Nothing
                , backgroundColor: Nothing
                , link: Nothing
                , hover: View.boxHoverStyleNone
                }
          )
          (Util.groupBySize (UInt.fromInt 3) list)
    , height: Nothing
    , backgroundColor: Nothing
    , gridTemplateColumns1FrCount: Nothing
    , link: Nothing
    , hover: View.boxHoverStyleNone
    }

copyright :: View.Element Message.Message
copyright =
  View.text
    { markup: View.None, padding: 8.0, text: "© 2021 narumincho", click: Nothing }

topBox :: Int -> View.Element Message.Message
topBox count =
  View.box
    { direction: View.Y
    , gap: 0.0
    , paddingTopBottom: 0.0
    , paddingLeftRight: 0.0
    , height: Nothing
    , backgroundColor: Nothing
    , gridTemplateColumns1FrCount: Nothing
    , link: Nothing
    , hover: View.boxHoverStyleNone
    , children:
        [ View.box
            { direction: View.Y
            , link:
                Just
                  ( View.linkSameOrigin
                      (Message.ChangeLocation (Just Location.Top))
                      (Location.toPath Location.Top)
                  )
            , children:
                [ View.SvgElement
                    { width: View.Percentage 90.0
                    , height: 5.0
                    , isJustifySelfCenter: true
                    , svg: SvgImage.webSiteLogo
                    }
                ]
            , gap: 0.0
            , paddingTopBottom: 48.0
            , paddingLeftRight: 0.0
            , height: Nothing
            , backgroundColor: Nothing
            , gridTemplateColumns1FrCount: Nothing
            , hover: View.boxHoverStyleNone
            }
        , View.text
            { markup: View.Heading2
            , padding: 8.0
            , text: Prelude.append "ナルミンチョの SNS アカウント" (Prelude.show count)
            , click: Just Message.CountUp
            }
        , View.box
            { direction: View.X
            , paddingTopBottom: 8.0
            , paddingLeftRight: 8.0
            , gap: 8.0
            , height: Just 4.0
            , backgroundColor: Nothing
            , gridTemplateColumns1FrCount: Nothing
            , link: Nothing
            , hover: View.boxHoverStyleNone
            , children:
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
            }
        , View.text
            { markup: View.Heading2
            , padding: 8.0
            , text: "ナルミンチョが作った Webアプリ"
            , click: Nothing
            }
        , View.box
            { direction: View.X
            , paddingTopBottom: 8.0
            , paddingLeftRight: 8.0
            , height: Nothing
            , backgroundColor: Nothing
            , link: Nothing
            , hover: View.boxHoverStyleNone
            , gap: 8.0
            , gridTemplateColumns1FrCount: Just 3
            , children:
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
            }
        , View.text
            { markup: View.Heading2, padding: 8.0, text: "ナルミンチョが書いた 記事", click: Nothing }
        , articleListToViewElement
            ( [ ArticleTitleAndImageUrl
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
              ]
            )
        , copyright
        ]
    }
