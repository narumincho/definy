module CreativeRecord.Page.NotFound (view) where

import CreativeRecord.Article as Article
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Article.Article
view =
  Article.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ページが見つかりませんでした")
    , children:
        [ View.boxY
            {}
            [ View.text
                { markup: View.Heading2
                , padding: 0.5
                }
                "ページが見つかりませんでした"
            ]
        ]
    }
