module CreativeRecord.Article.AboutDesiredRoute (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "DESIRED Routeについて")
    , imagePath: StaticResource.desired_route_titlePng
    , children:
        [ ViewHelper.boxY
            {}
            [ ViewHelper.text {} "更新日時 2019/10/4"
            , ViewHelper.text {} "作成日 2019/10/4"
            , ViewHelper.text {}
                "DESIRED Routeはプチコン3号で作られていたRPGです"
            , ViewHelper.text {} "2015年前後にメニュー画面とバトル画面とBGMが多少作られたが、マップなどグラフィック、セリフが不足して断念。"
            , ViewHelper.text {} "当時プチコンファンミーティングのLT会に登壇した(IT mediaの記事)。そのことが少しだけ記事に書かれている。「ペンコ改の知らね」(プチコンファンミーティングin東京レポートその3)でも紹介されている"
            ]
        ]
    }
