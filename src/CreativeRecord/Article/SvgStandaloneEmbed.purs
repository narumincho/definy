module CreativeRecord.Article.SvgStandaloneEmbed (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "単体SVGと埋め込みSVG")
    , imagePath: StaticResource.grape_svg_codePng
    , children:
        [ View.boxY
            {}
            [ View.text
                { markup: View.Heading2
                , padding: 0.5
                }
                "単体SVGと埋め込みSVG"
            , View.text {}
                "移植中です"
            ]
        ]
    }
