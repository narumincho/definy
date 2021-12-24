module CreativeRecord.Article.DesiredRouteFont (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "DESIRED RouteとNPIMEのフォントの描画処理")
    , imagePath: StaticResource.fontPng
    , children:
        [ View.boxY
            {}
            [ View.text
                { markup: View.Heading2
                , padding: 0.5
                }
                "DESIRED RouteとNPIMEのフォントの描画処理"
            , View.text {}
                "移植中です"
            ]
        ]
    }
