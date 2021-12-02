module CreativeRecord.Page.Wip (view) where

import Data.Maybe (Maybe(..))
import Prelude as Prelude
import View.Data as View

view :: View.Element Prelude.Unit
view =
  View.box
    { direction: View.Y
    , gap: 0.0
    , paddingTopBottom: 0.0
    , paddingLeftRight: 0.0
    , height: Nothing
    , backgroundColor: Nothing
    , gridTemplateColumns1FrCount: Nothing
    , url: Nothing
    , hover: View.boxHoverStyleNone
    , children:
        [ View.Text
            { markup: View.Heading2, padding: 8.0, text: "このページはまだ作成中です!" }
        ]
    }
