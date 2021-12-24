module CreativeRecord.Article.NPetitcomIme (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Nプチコン漢字入力(N Petitcom IME)")
    , imagePath: StaticResource.kamausagiPng
    , children:
        [ View.boxY
            {}
            [ View.text
                { markup: View.Heading2
                , padding: 0.5
                }
                "Nプチコン漢字入力(N Petitcom IME)"
            , View.text {}
                "移植中です"
            ]
        ]
    }
