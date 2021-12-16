module CreativeRecord.Page.Wip (view) where

import CreativeRecord.Article as Article
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Article.Article
view =
  Article.Article
    { title: Just (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "このページはまだ作成中です!"))
    , children:
        [ View.boxY
            {}
            [ View.text
                { markup: View.Heading2
                , padding: 8.0
                }
                "このページはまだ作成中です!"
            ]
        ]
    }
