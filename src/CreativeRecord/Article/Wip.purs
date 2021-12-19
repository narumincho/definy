module CreativeRecord.Article.Wip (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "このページはまだ作成中です!")
    , imagePath: StaticResource.definy20210811Png
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
