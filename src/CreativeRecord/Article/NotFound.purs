module CreativeRecord.Article.NotFound (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ページが見つかりませんでした")
    , imagePath: StaticResource.not_foundPng
    , children:
        [ ViewHelper.boxY
            {}
            [ ViewHelper.text
                { markup: View.Heading2
                , padding: 0.5
                }
                "ページが見つかりませんでした"
            ]
        ]
    }
