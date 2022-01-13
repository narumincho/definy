module CreativeRecord.Article.Star (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy (Proxy(..))
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy :: _ "星の図形について")
    , imagePath: StaticResource.starPng
    , children:
        [ ViewHelper.boxY
            {}
            [ ViewHelper.text {}
                "移植中です"
            ]
        ]
    }
