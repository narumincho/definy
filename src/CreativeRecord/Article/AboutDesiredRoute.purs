module CreativeRecord.Article.AboutDesiredRoute (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "DESIRED Routeについて")
    , imagePath: StaticResource.desired_route_titlePng
    , children:
        [ View.boxY
            {}
            [ View.text {}
                "移植中です"
            ]
        ]
    }
