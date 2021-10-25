module CreativeRecord.Top where

import Color as Color
import CreativeRecord.Location as Location
import CreativeRecord.SvgImage as SvgImage
import Css as Css
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Util as Util
import View.View as View

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

snsLink :: StructuredUrl.StructuredUrl -> View.Svg -> String -> View.Element Prelude.Unit
snsLink url logo text =
  View.box
    { direction: View.X
    , url: Maybe.Just url
    , paddingLeftRight: 8.0
    , paddingTopBottom: 8.0
    , gap: 8.0
    , height: Maybe.Nothing
    , backgroundColor: Maybe.Just linkBackGroundColor
    , hover: View.BoxHoverStyle { animation: Maybe.Just zoomAnimation }
    , gridTemplateColumns1FrCount: Maybe.Nothing
    , children:
        [ View.SvgElement { width: View.Rem 2.0, height: 2.0, svg: logo, isJustifySelfCenter: false }
        , View.Text { markup: View.None, padding: 8.0, text }
        ]
    }

externalLink :: StructuredUrl.StructuredUrl -> StructuredUrl.PathAndSearchParams -> String -> View.Element Prelude.Unit
externalLink url imageUrl text =
  View.box
    { direction: View.Y
    , url: Maybe.Just url
    , backgroundColor: Maybe.Just linkBackGroundColor
    , hover: View.BoxHoverStyle { animation: Maybe.Just zoomAnimation }
    , gap: 0.0
    , paddingTopBottom: 0.0
    , paddingLeftRight: 0.0
    , height: Maybe.Nothing
    , gridTemplateColumns1FrCount: Maybe.Nothing
    , children:
        [ View.Image
            { path: imageUrl
            , width: View.Percentage 100.0
            , height: 8.0
            }
        , View.Text { markup: View.None, padding: 8.0, text }
        ]
    }

articleLink :: ArticleTitleAndImageUrl -> View.Element Prelude.Unit
articleLink (ArticleTitleAndImageUrl { location, imagePath, title }) =
  View.box
    { direction: View.Y
    , backgroundColor: Maybe.Just linkBackGroundColor
    , url: Maybe.Just (Location.toUrl location)
    , hover: View.BoxHoverStyle { animation: Maybe.Just zoomAnimation }
    , children:
        [ View.Image
            { path: imagePath
            , width: View.Percentage 100.0
            , height: 8.0
            }
        , View.Text { markup: View.None, padding: 8.0, text: title }
        ]
    , gap: 0.0
    , paddingTopBottom: 0.0
    , paddingLeftRight: 0.0
    , height: Maybe.Nothing
    , gridTemplateColumns1FrCount: Maybe.Nothing
    }

newtype ArticleTitleAndImageUrl
  = ArticleTitleAndImageUrl
  { imagePath :: StructuredUrl.PathAndSearchParams
  , title :: String
  , location :: Location.Location
  }

articleListToViewElement :: Array ArticleTitleAndImageUrl -> View.Element Prelude.Unit
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
                , gridTemplateColumns1FrCount: Maybe.Just 3
                , children: Prelude.map articleLink row
                , paddingTopBottom: 0.0
                , paddingLeftRight: 0.0
                , height: Maybe.Nothing
                , backgroundColor: Maybe.Nothing
                , url: Maybe.Nothing
                , hover: View.boxHoverStyleNone
                }
          )
          (Util.groupBySize (UInt.fromInt 3) list)
    , height: Maybe.Nothing
    , backgroundColor: Maybe.Nothing
    , gridTemplateColumns1FrCount: Maybe.Nothing
    , url: Maybe.Nothing
    , hover: View.boxHoverStyleNone
    }

copyright :: View.Element Prelude.Unit
copyright =
  View.Text
    { markup: View.None, padding: 8.0, text: "© 2021 narumincho" }

topBox :: View.Box Prelude.Unit
topBox =
  View.Box
    { direction: View.Y
    , gap: 0.0
    , paddingTopBottom: 0.0
    , paddingLeftRight: 0.0
    , height: Maybe.Nothing
    , backgroundColor: Maybe.Nothing
    , gridTemplateColumns1FrCount: Maybe.Nothing
    , url: Maybe.Nothing
    , hover: View.boxHoverStyleNone
    , children:
        [ View.box
            { direction: View.Y
            , url: Maybe.Just (Location.toUrl Location.Top)
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
            , height: Maybe.Nothing
            , backgroundColor: Maybe.Nothing
            , gridTemplateColumns1FrCount: Maybe.Nothing
            , hover: View.boxHoverStyleNone
            }
        , View.Text
            { markup: View.Heading2, padding: 8.0, text: "ナルミンチョの SNS アカウント" }
        , View.box
            { direction: View.X
            , paddingTopBottom: 8.0
            , paddingLeftRight: 8.0
            , gap: 8.0
            , height: Maybe.Just 4.0
            , backgroundColor: Maybe.Nothing
            , gridTemplateColumns1FrCount: Maybe.Nothing
            , url: Maybe.Nothing
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
        , View.Text
            { markup: View.Heading2, padding: 8.0, text: "ナルミンチョが作った Webアプリ" }
        , View.box
            { direction: View.X
            , paddingTopBottom: 8.0
            , paddingLeftRight: 8.0
            , height: Maybe.Nothing
            , backgroundColor: Maybe.Nothing
            , url: Maybe.Nothing
            , hover: View.boxHoverStyleNone
            , gap: 8.0
            , gridTemplateColumns1FrCount: Maybe.Just 3
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
                    (StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "definy20210811Png") ] Map.empty)
                    "definy"
                , externalLink
                    ( StructuredUrl.StructuredUrl
                        { origin: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://narumincho-creative-record.web.app")
                        , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] Map.empty
                        }
                    )
                    (StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "gravity_starPng") ] Map.empty)
                    "重力星"
                , externalLink
                    ( StructuredUrl.StructuredUrl
                        { origin: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://tsukumart.com")
                        , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] Map.empty
                        }
                    )
                    (StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "tsukumartPng") ] Map.empty)
                    "つくマート"
                ]
            }
        , View.Text
            { markup: View.Heading2, padding: 8.0, text: "ナルミンチョが書いた 記事" }
        , articleListToViewElement
            ( [ ArticleTitleAndImageUrl
                  { title:
                      "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "powershell_iconPng") ] Map.empty
                  , location: Location.PowershellRecursion
                  }
              , ArticleTitleAndImageUrl
                  { title: "SVGの基本"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "svgBasic") ] Map.empty
                  , location: Location.SvgBasic
                  }
              , ArticleTitleAndImageUrl
                  { title: "単体SVGと埋め込みSVG"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "grape_svg_codePng") ] Map.empty
                  , location: Location.SvgStandaloneEmbed
                  }
              , ArticleTitleAndImageUrl
                  { title: "DESIRED Routeについて"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "desired_route_titlePng") ] Map.empty
                  , location: Location.AboutDesiredRoute
                  }
              , ArticleTitleAndImageUrl
                  { title: "メッセージウィンドウの話"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "windowPng") ] Map.empty
                  , location: Location.MessageWindow
                  }
              , ArticleTitleAndImageUrl
                  { title: "DESIRED RouteとNPIMEのフォントの描画処理"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "fontPng") ] Map.empty
                  , location: Location.DesiredRouteFont
                  }
              , ArticleTitleAndImageUrl
                  { title: "リストUIのボタン操作の挙動"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "list_uiPng") ] Map.empty
                  , location: Location.ListSelectionBehavior
                  }
              , ArticleTitleAndImageUrl
                  { title: "UIの配色"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "colorPng") ] Map.empty
                  , location: Location.UiColor
                  }
              , ArticleTitleAndImageUrl
                  { title: "モンスターとのエンカウントについて"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "battlePng") ] Map.empty
                  , location: Location.DesiredRouteEncounter
                  }
              , ArticleTitleAndImageUrl
                  { title: "星の図形について"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "starPng") ] Map.empty
                  , location: Location.Star
                  }
              , ArticleTitleAndImageUrl
                  { title: "DESIRED Routeに登場する予定だった敵モンスター"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "kamausagiPng") ] Map.empty
                  , location: Location.DesiredRouteMonster
                  }
              , ArticleTitleAndImageUrl
                  { title: "Nプチコン漢字入力(N Petitcom IME)"
                  , imagePath: StructuredUrl.pathAndSearchParams [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "henkanPng") ] Map.empty
                  , location: Location.NPetitcomIme
                  }
              ]
            )
        , copyright
        ]
    }
