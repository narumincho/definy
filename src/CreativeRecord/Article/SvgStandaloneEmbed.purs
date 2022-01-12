module CreativeRecord.Article.SvgStandaloneEmbed (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy (Proxy(..))
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy :: _ "単体SVGと埋め込みSVG")
    , imagePath: StaticResource.grape_svg_codePng
    , children:
        [ ViewHelper.boxY
            {}
            [ ViewHelper.text {}
                "SVGには、1つのファイルとして独立できる単体SVGと、HTMLに埋め込むSVGの2種類がある"
            , ViewHelper.text { markup: ViewHelper.Heading2 }
                "単体SVG"
            , ViewHelper.text {} "1つのファイルとして独立している。ファイルの拡張子はsvg。「grape.svg」とかになる"
            , ViewHelper.text {} "[グレープの画像とコードは移植中]"
            , ViewHelper.text {} """単体SVGはXMLのルールに従って記述することになっている。1行目<?xml version="1.0"?>はXML宣言(XML declaration)と言い、このファイルがXML形式のversionが1.0であることを表す。この宣言は省略することができる。文字コードがUTF-8かUTF-16であれば、encodingの指定を省略できる。web標準的に文字コードはUTF-8を強く推奨。ちなみにXMLのversionには1.1と2.0もあるが、あまり使われていないので使わないほうが良い"""
            , ViewHelper.text {} "<svg>で指定しているxmlns(XML Name Space)は中で使うタグと属性の参照先を示すもので、http://www.w3.org/2000/svg と指定すると画像ファイルのSVGのタグと属性を使うことを示すことになる。なぜURLで指定するかというと、絶対にかぶらないから。1つのURLは世界で ある1つのものを指定するしできる"
            , ViewHelper.text {} "使い方"
            , ViewHelper.text {} "ファイルをそのままブラウザや画像ビュアーで表示したり、HTMLのimg要素で使える"
            , ViewHelper.text {} "HTMLファイル"
            , ViewHelper.text { markup: ViewHelper.Code } """<img src="image.svg" alt="説明">"""
            , ViewHelper.text {} "ただし、CSSでスタイルを変更することはできないなど制約がある"
            , ViewHelper.text { markup: ViewHelper.Heading2 } "埋め込みSVG"
            , ViewHelper.text {} "HTMLに埋め込む形"
            , ViewHelper.text {} "[グレープの画像は移植中]"
            , ViewHelper.text { markup: ViewHelper.Code }
                """<!doctype html>
<svg viewbox="0 0 218 265">
    <defs>
        <radialgradient id=gradient >
            <stop offset=0 stop-color="rgb(161, 77, 245)" />
            <stop offset=1 stop-color="rgb(110, 12, 206)" />
        </radialgradient>
    </defs>
    <polyline stroke=black fill="rgb(13, 133, 59)" points="99,87 98,14 68,15 68,0 141,1 141,15 115,16 118,85" />
    <g stroke=black fill=url(#gradient) >
        <circle cx=30 cy=69 r=30 />
        <circle cx=75 cy=68 r=29 />
        <circle cx=131 cy=62 r=28 />
        <circle cx=180 cy=70 r=32 />
        <circle cx=167 cy=123 r=34 />
        <circle cx=112 cy=118 r=43 />
        <circle cx=45 cy=114 r=31 />
        <circle cx=154 cy=170 r=29 />
        <circle cx=66 cy=168 r=29 />
        <circle cx=113 cy=184 r=24 />
        <circle cx=80 cy=210 r=19 />
        <circle cx=144 cy=213 r=25 />
        <circle cx=104 cy=237 r=28 />
    </g>
</svg>"""
            , ViewHelper.text {} "<!doctype html>はHTML5ファイルであることを示し、省略することはできない。今回は<html>、<head>、<body>を省略している"
            , ViewHelper.text {} """HTML5はXMLと違って記述のルールがゆるいので、viewBoxをviewbox、radialGradientをradialgradientと書けたり、属性の値に"、 (スペース)、<、>、=、'、`(グレイヴ・アクセント)を含まないなら属性値を"で囲む必要がない。HTMLとして書いていたけど単体SVGに移したいとなった場合に変換するのは面倒なので、大文字小文字は定義通りに、"は省略しないようにしよう。"""
            , ViewHelper.text {} "HTMLのDOMの一部として、CSSでのスタイルやJavaScriptで要素の操作ができる"
            ]
        ]
    }
