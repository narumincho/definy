module CreativeRecord.Article.Wip (view) where

import CreativeRecord.Article.Data as Data
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "このページはまだ作成中です!")
    , children:
        [ View.boxY
            {}
            [ View.text
                { markup: View.Heading2
                , padding: 0.5
                }
                "このページはまだ作成中です!"
            ]
        ]
    }
