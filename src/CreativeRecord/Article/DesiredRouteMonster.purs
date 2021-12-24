module CreativeRecord.Article.DesiredRouteMonster (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "DESIRED Routeに登場する予定だった敵モンスター")
    , imagePath: StaticResource.kamausagiPng
    , children:
        [ View.boxY
            {}
            [ View.text
                { markup: View.Heading2
                , padding: 0.5
                }
                "DESIRED Routeに登場する予定だった敵モンスター"
            , View.text {}
                "移植中です"
            ]
        ]
    }
