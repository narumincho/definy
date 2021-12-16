module CreativeRecord.Page.NotFound (view) where

import CreativeRecord.Article as Article
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Article.Article
view =
  Article.Article
    { title: Just (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ページが見つかりませんでした"))
    , children:
        [ View.boxY
            {}
            [ View.text
                { markup: View.Heading2
                , padding: 8.0
                }
                "ページが見つかりませんでした"
            ]
        ]
    }
