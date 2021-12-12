module CreativeRecord.Page.Wip (view) where

import Data.Maybe (Maybe(..))
import CreativeRecord.Messgae as Message
import View.Data as View

view :: View.Element Message.Message
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
            , text: "このページはまだ作成中です!"
            , click: Nothing
            }
        ]
    }
