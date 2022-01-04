module CreativeRecord.Article.AboutDesiredRoute (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.Element as Element
import CreativeRecord.Location as Location
import CreativeRecord.Message as Message
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import View.Data as ViewData
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy :: _ "DESIRED Routeについて")
    , imagePath: StaticResource.desired_route_titlePng
    , children: children
    }

children :: Array (ViewData.Element Message.Message Location.Location)
children =
  [ ViewHelper.text {} "更新日時 2019/10/4"
  , ViewHelper.text {} "作成日 2019/10/4"
  , Element.paragraph
      [ Element.spanNormalText "DESIRED Routeは"
      , Element.inlineAnchorExternal
          ( StructuredUrl.StructuredUrl
              { origin: NonEmptyString.nes (Proxy :: _ "http://smilebasic.com")
              , pathAndSearchParams: StructuredUrl.fromPath []
              }
          )
          "プチコン3号"
      , Element.spanNormalText "で作られていたRPGです"
      ]
  , Element.paragraphText "2015年前後にメニュー画面とバトル画面とBGMが多少作られたが、マップなどグラフィック、セリフが不足して断念。"
  , Element.paragraph
      [ Element.spanNormalText "当時プチコンファンミーティングのLT会に登壇した. そのことが少しだけ"
      , Element.inlineAnchorExternal
          ( StructuredUrl.StructuredUrl
              -- https://www.itmedia.co.jp/pcuser/articles/1510/20/news137_3.html
              { origin: NonEmptyString.nes (Proxy :: _ "https://www.itmedia.co.jp")
              , pathAndSearchParams:
                  StructuredUrl.fromPath
                    [ NonEmptyString.nes (Proxy :: _ "pcuser")
                    , NonEmptyString.nes (Proxy :: _ "articles")
                    , NonEmptyString.nes (Proxy :: _ "1510")
                    , NonEmptyString.nes (Proxy :: _ "20")
                    , NonEmptyString.nes (Proxy :: _ "news137_3.html")
                    ]
              }
          )
          "IT mediaの記事"
      , Element.spanNormalText "に書かれている."
      , Element.inlineAnchorExternal
          ( StructuredUrl.StructuredUrl
              -- http://penkogoma.blog6.fc2.com/blog-entry-223.html
              { origin: NonEmptyString.nes (Proxy :: _ "http://penkogoma.blog6.fc2.com")
              , pathAndSearchParams:
                  StructuredUrl.fromPath
                    [ NonEmptyString.nes (Proxy :: _ "blog-entry-223.html") ]
              }
          )
          "「ペンコ改の知らね」(プチコンファンミーティングin東京レポートその3)"
      , ViewHelper.span { style: ViewData.createStyle {} [] } "でも紹介されている"
      ]
  ]
