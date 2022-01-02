module CreativeRecord.Element
  ( inlineAnchorExternal
  , inlineAnchorLocal
  , paragraph
  , paragraphText
  , spanNormalText
  ) where

import Color as Color
import Color.Scheme.MaterialDesign as ColorMaterial
import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import Css as Css
import StructuredUrl as StructuredUrl
import View.Data as ViewData
import View.Helper as ViewHelper

paragraphText :: String -> ViewData.Element Message.Message Location.Location
paragraphText textValue =
  ViewHelper.divText
    { style:
        ViewData.createStyle {}
          [ Css.color Color.white
          , Css.padding { leftRight: 0.5, topBottom: 0.5 }
          , Css.fontSize 1.2
          ]
    }
    textValue

paragraph :: Array (ViewData.Element Message.Message Location.Location) -> ViewData.Element Message.Message Location.Location
paragraph children =
  ViewHelper.div
    { style:
        ViewData.createStyle {}
          [ Css.color Color.white
          , Css.padding { leftRight: 0.5, topBottom: 0.5 }
          ]
    }
    children

spanNormalText :: String -> ViewData.Element Message.Message Location.Location
spanNormalText textValue =
  ViewHelper.span
    { style:
        ViewData.createStyle {}
          [ Css.color Color.white
          , Css.fontSize 1.2
          ]
    }
    textValue

inlineAnchorLocal :: Location.Location -> String -> ViewData.Element Message.Message Location.Location
inlineAnchorLocal location textValue =
  ViewHelper.inlineAnchor
    { style:
        ViewData.createStyle {}
          [ Css.color ColorMaterial.lightBlue
          , Css.fontSize 1.2
          ]
    , link: ViewData.LinkSameOrigin location
    }
    textValue

inlineAnchorExternal :: StructuredUrl.StructuredUrl -> String -> ViewData.Element Message.Message Location.Location
inlineAnchorExternal url textValue =
  ViewHelper.inlineAnchor
    { style:
        ViewData.createStyle {}
          [ Css.color ColorMaterial.lightBlue
          , Css.fontSize 1.2
          ]
    , link: ViewData.LinkExternal url
    }
    textValue
