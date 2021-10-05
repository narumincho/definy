module CreativeRecord.Top where

import Css as Css
import Data.Map as Map
import Data.Maybe as Maybe
import CreativeRecord.Location as Location
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import CreativeRecord.SvgImage as SvgImage
import Util as Util
import View.View as View

linkBackGroundColor :: String
linkBackGroundColor = "#333333"

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
          (Util.groupBySize list 3)
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
        , View.BoxElement
            ( View.Box
                ( { direction: View.X
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
                              { origin: "https://twitter.com"
                              , pathAndSearchParams: StructuredUrl.pathAndSearchParams [ "naru_mincho" ] Map.empty
                              }
                          )
                          SvgImage.twitterLogo
                          "@naru_mincho"
                      , snsLink
                          ( StructuredUrl.StructuredUrl
                              { origin: "https://github.com"
                              , pathAndSearchParams: StructuredUrl.pathAndSearchParams [ "narumincho" ] Map.empty
                              }
                          )
                          SvgImage.gitHubLogo
                          "@narumincho"
                      , snsLink
                          ( StructuredUrl.StructuredUrl
                              { origin: "https://www.youtube.com"
                              , pathAndSearchParams: StructuredUrl.pathAndSearchParams [ "channel", "UCDGsMJptdPNN_dbPkTl9qjA" ] Map.empty
                              }
                          )
                          SvgImage.youTubeLogo
                          "ナルミンチョ"
                      ]
                  }
                )
            )
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
                        { origin: "https://definy.app/?hl=ja"
                        , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] (Map.singleton "hl" "ja")
                        }
                    )
                    (StructuredUrl.pathAndSearchParams [ "definy20210811Png" ] Map.empty)
                    "definy"
                , externalLink
                    ( StructuredUrl.StructuredUrl
                        { origin: "https://narumincho-creative-record.web.app"
                        , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] Map.empty
                        }
                    )
                    (StructuredUrl.pathAndSearchParams [ "gravity_starPng" ] Map.empty)
                    "重力星"
                , externalLink
                    ( StructuredUrl.StructuredUrl
                        { origin: "https://tsukumart.com"
                        , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] Map.empty
                        }
                    )
                    (StructuredUrl.pathAndSearchParams [ "tsukumartPng" ] Map.empty)
                    "つくマート"
                ]
            }
        , View.Text
            { markup: View.Heading2, padding: 8.0, text: "ナルミンチョが書いた 記事" }
        , articleListToViewElement
            ( [ ArticleTitleAndImageUrl
                  { title:
                      "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "powershell_iconPng" ] Map.empty
                  , location: Location.PowershellRecursion
                  }
              , ArticleTitleAndImageUrl
                  { title: "SVGの基本"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "svgBasic" ] Map.empty
                  , location: Location.SvgBasic
                  }
              , ArticleTitleAndImageUrl
                  { title: "単体SVGと埋め込みSVG"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "grape_svg_codePng" ] Map.empty
                  , location: Location.SvgStandaloneEmbed
                  }
              , ArticleTitleAndImageUrl
                  { title: "DESIRED Routeについて"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "desired_route_titlePng" ] Map.empty
                  , location: Location.AboutDesiredRoute
                  }
              , ArticleTitleAndImageUrl
                  { title: "メッセージウィンドウの話"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "windowPng" ] Map.empty
                  , location: Location.MessageWindow
                  }
              , ArticleTitleAndImageUrl
                  { title: "DESIRED RouteとNPIMEのフォントの描画処理"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "fontPng" ] Map.empty
                  , location: Location.DesiredRouteFont
                  }
              , ArticleTitleAndImageUrl
                  { title: "リストUIのボタン操作の挙動"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "list_uiPng" ] Map.empty
                  , location: Location.ListSelectionBehavior
                  }
              , ArticleTitleAndImageUrl
                  { title: "UIの配色"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "colorPng" ] Map.empty
                  , location: Location.UiColor
                  }
              , ArticleTitleAndImageUrl
                  { title: "モンスターとのエンカウントについて"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "battlePng" ] Map.empty
                  , location: Location.DesiredRouteEncounter
                  }
              , ArticleTitleAndImageUrl
                  { title: "星の図形について"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "starPng" ] Map.empty
                  , location: Location.Star
                  }
              , ArticleTitleAndImageUrl
                  { title: "DESIRED Routeに登場する予定だった敵モンスター"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "kamausagiPng" ] Map.empty
                  , location: Location.DesiredRouteMonster
                  }
              , ArticleTitleAndImageUrl
                  { title: "Nプチコン漢字入力(N Petitcom IME)"
                  , imagePath: StructuredUrl.pathAndSearchParams [ "henkanPng" ] Map.empty
                  , location: Location.NPetitcomIme
                  }
              ]
            )
        , copyright
        ]
    }
