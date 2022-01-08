module CreativeRecord.Article.SvgBasic (view) where

import Color as Color
import CreativeRecord.Article.Data as Data
import CreativeRecord.Element as Element
import CreativeRecord.Location as Location
import CreativeRecord.Message as Message
import CreativeRecord.StaticResource as StaticResource
import Css as Css
import Data.Array.NonEmpty as NonEmptyArray
import Data.String.NonEmpty as NonEmptyString
import Html.Wellknown as HtmlWellknown
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Type.Proxy as Proxy
import View.Data as View
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "SVGの基本")
    , imagePath: StaticResource.svg_basicPng
    , children:
        [ ViewHelper.boxY
            {}
            [ ViewHelper.text {}
                "SVG(Scalable Vector Graphics)はベクタ形式の画像を表現するためのルール. W3C(World Wide Web Consortium)によって標準化された."
            , ViewHelper.text {} "SVGで描かれたみかん"
            , ViewHelper.boxX {}
                [ ViewHelper.svg
                    { height: 16.0
                    , isJustifySelfCenter: true
                    , width: ViewHelper.Rem 16.0
                    , svg: orange
                    }
                , Element.htmlCodeWithSyntaxHighlightFromSvg orange
                ]
            , ViewHelper.text {} "SVGの良いところはたくさんあるが、その中で2つ紹介したい"
            , ViewHelper.text { markup: ViewHelper.Heading2 } "ベクタ形式なので拡大してもギザギザしない"
            , compareVectorAndRaster
            , ViewHelper.text {} "このサイトで使われるfavicon(ブラウザのタブのアイコンとかに表示される)は互換性を重視しラスタ形式のPNGファイルにしている. SafariがSVGのfaviconに対応していない(2022年時点). ホーム画面に追加したときなどはちゃんと表示されるのだろうか"
            , ViewHelper.text { markup: ViewHelper.Heading2 } "アクセシビリティに優れている"
            , Element.paragraph
                [ Element.inlineAnchorExternal
                    ( StructuredUrl.StructuredUrl
                        { origin: NonEmptyString.nes (Proxy :: _ "https://kuina.ch")
                        , pathAndSearchParams: StructuredUrl.fromPath []
                        }
                    )
                    "くいなちゃんのホームページ"
                , Element.spanNormalText "に変わった形のメニューがあるけど、リンクの当たり判定が四角だったり、文字を検索で探すことができないのでSVGで勝手にリメイクしてみた(あえてそうしているかもしれないが)"
                ]
            , ViewHelper.text {} "[くいなちゃんのホームページのメニュー SVG version は移植中]"
            , ViewHelper.text {} "このように、リンクの形を工夫できたり、マウスを載せて一部だけ色を変えたり、文字を検索、コピーができる. (それにしても、封印された地下ってなんだろう?)"
            ]
        ]
    }

orange :: View.Svg
orange =
  View.Svg
    { viewBox: HtmlWellknown.ViewBox { x: 0.0, y: 0.0, width: 324.0, height: 324.0 }
    , svgElementList:
        [ ViewHelper.svgCircle { cx: 162.0, cy: 162.0, r: 155.0, fill: Color.rgb 255 165 0 }
        , ViewHelper.svgCircle { cx: 123.0, cy: 274.0, r: 10.0, fill: Color.rgb 255 212 39 }
        , ViewHelper.svgCircle { cx: 271.0, cy: 157.0, r: 11.0, fill: Color.rgb 255 212 39 }
        , ViewHelper.svgCircle { cx: 269.0, cy: 197.0, r: 11.0, fill: Color.rgb 255 212 39 }
        , ViewHelper.svgCircle { cx: 243.0, cy: 226.0, r: 13.0, fill: Color.rgb 255 212 39 }
        , ViewHelper.svgCircle { cx: 210.0, cy: 265.0, r: 9.0, fill: Color.rgb 255 212 39 }
        , ViewHelper.svgCircle { cx: 158.0, cy: 268.0, r: 10.0, fill: Color.rgb 255 212 39 }
        , ViewHelper.svgCircle { cx: 201.0, cy: 232.0, r: 10.0, fill: Color.rgb 255 212 39 }
        , ViewHelper.svgPolygon
            { points:
                NonEmptyArray.cons'
                  { x: 162.0, y: 20.0 }
                  [ { x: 170.0, y: 28.0 }
                  , { x: 180.0, y: 25.0 }
                  , { x: 188.0, y: 36.0 }
                  , { x: 198.0, y: 42.0 }
                  , { x: 188.0, y: 50.0 }
                  , { x: 180.0, y: 60.0 }
                  , { x: 162.0, y: 53.0 }
                  , { x: 144.0, y: 60.0 }
                  , { x: 136.0, y: 50.0 }
                  , { x: 126.0, y: 42.0 }
                  , { x: 136.0, y: 36.0 }
                  , { x: 144.0, y: 25.0 }
                  , { x: 154.0, y: 28.0 }
                  ]
            , stroke: Color.black
            , fill: Color.rgb 97 126 47
            }
        , ViewHelper.svgEllipse
            { cx: 162.0
            , cy: 40.0
            , rx: 25.0
            , ry: 10.0
            , fill: Color.rgb 102 174 92
            }
        ]
    }

compareVectorAndRaster :: View.ElementAndStyle Message.Message Location.Location
compareVectorAndRaster =
  ViewHelper.svg
    { height: 16.0
    , isJustifySelfCenter: true
    , width: ViewHelper.Rem 16.0
    , svg:
        View.Svg
          { viewBox: HtmlWellknown.ViewBox { x: 0.0, y: 0.0, width: 50.0, height: 60.0 }
          , svgElementList:
              [ ViewHelper.svgText
                  { x: 25.0, y: 24.0, fontSize: 2.0, fill: Color.white }
                  "ベクタ形式(SVGで使っている形式)"
              , ViewHelper.svgText
                  { x: 25.0, y: 53.0, fontSize: 2.0, fill: Color.white }
                  "ラスタ形式"
              , ViewHelper.svgText
                  { x: 25.0, y: 3.0, fontSize: 2.0, fill: Color.white }
                  "[図の一部だけ移植完了]"
              {-
  <symbol id="na-icon" viewBox="0 0 43 42">
    <defs>
      <linearGradient
        id="gradient-3"
        gradientUnits="userSpaceOnUse"
        x1="21.426"
        y1="0.045"
        x2="21.426"
        y2="42.161"
        gradientTransform="matrix(-0.707916, 0.706297, -0.689999, -0.667587, 51.154853, 20.057992)"
      >
        <stop offset="0" style="stop-color: rgba(51, 51, 51, 1)"></stop>
        <stop offset="1" style="stop-color: rgb(246, 132, 6)"></stop>
      </linearGradient>
    </defs>
    <rect width="43" height="42" x="0" y="0" fill="url(#gradient-3)"></rect>
    <path
      d="M 20.886 17.225 L 8.146 17.225 C 7.813 17.225 7.519 17.105 7.266 16.865 C 7.019 16.625 6.896 16.338 6.896 16.005 C 6.896 15.671 7.019 15.381 7.266 15.135 C 7.519 14.888 7.813 14.765 8.146 14.765 L 20.886 14.765 C 21.079 14.765 21.176 14.668 21.176 14.475 L 21.176 8.475 C 21.176 8.068 21.313 7.728 21.586 7.455 C 21.859 7.181 22.199 7.045 22.606 7.045 C 23.013 7.045 23.353 7.181 23.626 7.455 C 23.899 7.728 24.036 8.068 24.036 8.475 L 24.036 14.475 C 24.036 14.668 24.143 14.765 24.356 14.765 L 34.706 14.765 C 35.039 14.765 35.333 14.888 35.586 15.135 C 35.833 15.381 35.956 15.671 35.956 16.005 C 35.956 16.338 35.833 16.625 35.586 16.865 C 35.333 17.105 35.039 17.225 34.706 17.225 L 24.356 17.225 C 24.143 17.225 24.036 17.318 24.036 17.505 C 24.009 22.338 23.056 26.165 21.176 28.985 C 19.296 31.805 16.356 33.845 12.356 35.105 C 12.023 35.205 11.703 35.171 11.396 35.005 C 11.083 34.838 10.869 34.588 10.756 34.255 C 10.636 33.921 10.659 33.595 10.826 33.275 C 10.993 32.948 11.243 32.738 11.576 32.645 C 14.976 31.458 17.419 29.705 18.906 27.385 C 20.393 25.058 21.149 21.765 21.176 17.505 C 21.176 17.318 21.079 17.225 20.886 17.225 Z"
      fill="white"
    ></path>
  </symbol>
  <defs>
    <clipPath id="clip">
      <rect x="32" y="12" width="8" height="8"></rect>
    </clipPath>
  </defs>
  <symbol id="enlarged" viewBox="32 12 8 8">
    <use
      xlink:href="#na-icon"
      clip-path="url(#clip)"
      x="0"
      y="0"
      width="43"
      height="42"
    ></use>
  </symbol>
  <symbol id="enlarged-raster" viewBox="32 12 8 8">
    <image
      xlink:href="/image/icon.png"
      clip-path="url(#clip)"
      x="0"
      y="0"
      width="43"
      height="43"
    ></image>
  </symbol>
  <symbol id="auxiliary-line">
    <rect
      x="15"
      y="7"
      width="4"
      height="4"
      fill="none"
      stroke="black"
      stroke-width=".2"
    ></rect>
    <line
      x1="15"
      y1="7"
      x2="29"
      y2="1"
      stroke="black"
      stroke-width=".1"
      stroke-dasharray=".4"
    ></line>
    <line
      x1="19"
      y1="7"
      x2="49"
      y2="1"
      stroke="black"
      stroke-width=".1"
      stroke-dasharray=".4"
    ></line>
    <line
      x1="15"
      y1="11"
      x2="29"
      y2="21"
      stroke="black"
      stroke-width=".1"
      stroke-dasharray=".4"
    ></line>
    <line
      x1="19"
      y1="11"
      x2="49"
      y2="21"
      stroke="black"
      stroke-width=".1"
      stroke-dasharray=".4"
    ></line>
    <rect
      x="29"
      y="1"
      width="20"
      height="20"
      fill="none"
      stroke="black"
      stroke-width=".4"
    ></rect>
  </symbol>
  <use xlink:href="#na-icon" x="0" y="1" width="20" height="20"></use>
  <use xlink:href="#enlarged" x="29" y="1" width="20" height="20"></use>
  <use xlink:href="#auxiliary-line"></use>
  <text x="25" y="24" text-anchor="middle" font-size="2">
    ベクタ形式(SVGで使っている形式)
  </text>

  <image
    xlink:href="/image/icon.png"
    x="0"
    y="30"
    width="21"
    height="20"
  ></image>
  <use xlink:href="#enlarged-raster" x="29" y="30" width="20" height="20"></use>
  <use xlink:href="#auxiliary-line" transform="translate(0,29)"></use>
  <text x="25" y="53" text-anchor="middle" font-size="2">ラスタ形式</text>

-}
              ]
          }
    }
