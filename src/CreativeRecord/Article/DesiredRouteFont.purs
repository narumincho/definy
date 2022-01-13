module CreativeRecord.Article.DesiredRouteFont (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy (Proxy(..))
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy :: _ "DESIRED RouteとNPIMEのフォントの描画処理")
    , imagePath: StaticResource.fontPng
    , children:
        [ ViewHelper.boxY
            {}
            [ ViewHelper.text {}
                "移植中です"
            ]
        ]
    }
