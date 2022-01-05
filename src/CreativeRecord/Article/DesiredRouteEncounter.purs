module CreativeRecord.Article.DesiredRouteEncounter (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "モンスターとのエンカウントについて")
    , imagePath: StaticResource.battlePng
    , children:
        [ ViewHelper.boxY
            {}
            [ ViewHelper.text {}
                "移植中です"
            ]
        ]
    }