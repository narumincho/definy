module Definy.Html
  ( DefinyHtmlOption
  , generateDefinyHtml
  , globalStyleAsString
  ) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Html.ToString as HtmlToString
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Vdom.ToHtml as VdomToHtml
import Vdom.VdomPicked as VdomPicked
import View.StyleDict as ViewStyleDict

type DefinyHtmlOption
  = { description :: String
    , iconPath :: StructuredUrl.PathAndSearchParams
    , language :: Maybe Language.Language
    , coverImagePath :: StructuredUrl.PathAndSearchParams
    , path :: Maybe StructuredUrl.PathAndSearchParams
    , origin :: NonEmptyString
    }

generateDefinyHtml :: DefinyHtmlOption -> String
generateDefinyHtml option =
  HtmlToString.toString
    ( VdomToHtml.toHtml
        { vdom: generateDefinyHtmlAsVdomPicked option
        , locationToPathAndSearchParams: Prelude.absurd
        }
    )

generateDefinyHtmlAsVdomPicked :: DefinyHtmlOption -> VdomPicked.VdomPicked Prelude.Void Prelude.Void
generateDefinyHtmlAsVdomPicked option =
  VdomPicked.VdomPicked
    { pageName:
        case option.language of
          Just Language.Japanese ->
            NonEmptyString.nes
              (Proxy :: _ "definy 手軽に堅牢なゲームとツールが作れて公開できる が目標のWebアプリ")
          _ -> NonEmptyString.nes (Proxy :: _ "definy")
    , appName: NonEmptyString.nes (Proxy :: _ "definy")
    , description: option.description
    , themeColor: Nothing
    , iconPath: option.iconPath
    , language: option.language
    , coverImagePath: option.coverImagePath
    , path: option.path
    , origin: option.origin
    , style: globalStyle
    , scriptPath:
        Just
          ( StructuredUrl.fromPath
              [ NonEmptyString.nes (Proxy :: _ "main.js") ]
          )
    , bodyClass: Nothing
    , pointerMove: Nothing
    , pointerDown: Nothing
    , children:
        [ Tuple.Tuple "loading-message"
            ( VdomPicked.ElementAndClass
                { element:
                    VdomPicked.ElementDiv
                      ( VdomPicked.Div
                          { click: Nothing
                          , children:
                              VdomPicked.ChildrenText case option.language of
                                Just Language.English -> "Loading definy ..."
                                Just Language.Japanese -> "definyを読込中……"
                                Just Language.Esperanto -> "Ŝarĝante definy ..."
                                Nothing -> "call back from login page"
                          }
                      )
                , class: Nothing
                , id: Nothing
                }
            )
        ]
    }

hackFontName :: NonEmptyString
hackFontName = NonEmptyString.nes (Proxy :: _ "Hack")

globalStyleAsString :: String
globalStyleAsString = Css.statementListToString globalStyle

globalStyle :: Css.StatementList
globalStyle =
  let
    (Css.StatementList { ruleList }) =
      ViewStyleDict.simpleDarkModeGlobalCss
        (Just hackFontName)
  in
    Css.StatementList
      { keyframesList: []
      , ruleList:
          Array.cons
            ( Css.Rule
                { selector: Css.Universal
                , declarationList:
                    [ Css.boxSizingBorderBox
                    , Css.color Color.white
                    ]
                }
            )
            ruleList
      , fontFaceList:
          [ Css.createFontFace
              """
/*
  Hack typeface https://github.com/source-foundry/Hack
  License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
*/

@font-face {
  font-family: "Hack";
  font-weight: 400;
  font-style: normal;
  src: url("/hack-regular-subset.woff2") format("woff2");
}
"""
          ]
      }
