module CreativeRecord.Article.NPetitcomIme (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Nプチコン漢字入力(N Petitcom IME)")
    , imagePath: StaticResource.henkanPng
    , children:
        [ ViewHelper.boxY
            {}
            [ ViewHelper.text {}
                "移植中です"
            ]
        ]
    }