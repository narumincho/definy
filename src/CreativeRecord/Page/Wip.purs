module CreativeRecord.Page.Wip (view) where

import CreativeRecord.Article as Article
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Article.Article
view =
  Article.Article
    { title: Just (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "このページはまだ作成中です!"))
    , children:
        [ View.box
            { direction: View.Y
            , gap: 0.0
            , paddingTopBottom: 0.0
            , paddingLeftRight: 0.0
            , height: Nothing
            , backgroundColor: Nothing
            , gridTemplateColumns1FrCount: Nothing
            , link: Nothing
            , hover: View.boxHoverStyleNone
            , children:
                [ View.text
                    { markup: View.Heading2
                    , padding: 8.0
                    , text: "このページはまだ作成中です!"
                    , click: Nothing
                    }
                ]
            }
        ]
    }
