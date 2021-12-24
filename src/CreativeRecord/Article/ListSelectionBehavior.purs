module CreativeRecord.Article.ListSelectionBehavior (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "リストUIのボタン操作の挙動")
    , imagePath: StaticResource.list_uiPng
    , children:
        [ View.boxY
            {}
            [ View.text {}
                "移植中です"
            ]
        ]
    }
