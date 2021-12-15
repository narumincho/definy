module CreativeRecord.Page.NotFound (view) where

import Data.Maybe (Maybe(..))
import View.Data as View
import CreativeRecord.Messgae as Message
import CreativeRecord.Location as Location

view :: View.Element Message.Message Location.Location
view =
  View.box
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
            , text: "ページが見つかりませんでした"
            , click: Nothing
            }
        ]
    }
