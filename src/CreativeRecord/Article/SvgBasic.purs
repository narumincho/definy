module CreativeRecord.Article.SvgBasic (view) where

import Color as Color
import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.Array.NonEmpty as NonEmptyArray
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "SVGの基本")
    , imagePath: StaticResource.svg_basicPng
    , children:
        [ View.boxY
            {}
            [ View.text {}
                "SVG(Scalable Vector Graphics)はベクタ形式の画像を表現するためのルール. W3C(World Wide Web Consortium)によって標準化された."
            , View.text {} "SVGで描かれたみかん"
            , View.boxX {}
                [ View.SvgElement
                    { height: 16.0
                    , isJustifySelfCenter: true
                    , width: View.Rem 16.0
                    , svg: orange
                    }
                ]
            , View.text {} "SVGの良いところはたくさんあるが、その中で2つ紹介したい"
            ]
        ]
    }

orange :: View.Svg
orange =
  View.Svg
    { viewBox: View.ViewBox { x: 0.0, y: 0.0, width: 324.0, height: 324.0 }
    , svgElementList:
        [ View.Circle { cx: 162.0, cy: 162.0, r: 155.0, fill: Color.rgb 255 165 0 }
        , View.Circle { cx: 123.0, cy: 274.0, r: 10.0, fill: Color.rgb 255 212 39 }
        , View.Circle { cx: 271.0, cy: 157.0, r: 11.0, fill: Color.rgb 255 212 39 }
        , View.Circle { cx: 269.0, cy: 197.0, r: 11.0, fill: Color.rgb 255 212 39 }
        , View.Circle { cx: 243.0, cy: 226.0, r: 13.0, fill: Color.rgb 255 212 39 }
        , View.Circle { cx: 210.0, cy: 265.0, r: 9.0, fill: Color.rgb 255 212 39 }
        , View.Circle { cx: 158.0, cy: 268.0, r: 10.0, fill: Color.rgb 255 212 39 }
        , View.Circle { cx: 201.0, cy: 232.0, r: 10.0, fill: Color.rgb 255 212 39 }
        , View.Polygon
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
        , View.Ellipse
            { cx: 162.0
            , cy: 40.0
            , rx: 25.0
            , ry: 10.0
            , fill: Color.rgb 102 174 92
            }
        ]
    }
