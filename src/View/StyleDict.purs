module View.StyleDict
  ( StyleDict
  , addStyleDictAndClassName
  , createStyleDictAndClassName
  , listStyleDictToStyleDict
  , sha256HashValueToAnimationName
  , toCssStatementList
  ) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Map as Map
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Hash as Hash
import Html.Wellknown as HtmlWellknown
import Prelude as Prelude
import View.Data as Data

-- | CSS スタイルと, アニメーションのkeyframeをまとめた辞書
newtype StyleDict
  = StyleDict
  { keyframes :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
  , style :: Map.Map Hash.Sha256HashValue Data.ViewStyle
  }

createStyleDictAndClassName ::
  Data.ViewStyle ->
  Map.Map Hash.Sha256HashValue (Array Css.Keyframe) ->
  { styleDict :: StyleDict, className :: NonEmptyString }
createStyleDictAndClassName viewStyle animation =
  let
    classNameHashValue :: Hash.Sha256HashValue
    classNameHashValue = viewStyleToSha256HashValue viewStyle

    className :: NonEmptyString
    className = sha256HashValueToClassName classNameHashValue
  in
    { styleDict:
        StyleDict
          { style: Map.singleton classNameHashValue viewStyle
          , keyframes: animation
          }
    , className
    }

addStyleDictAndClassName ::
  StyleDict ->
  Data.ViewStyle ->
  Map.Map Hash.Sha256HashValue (Array Css.Keyframe) ->
  { styleDict :: StyleDict, className :: NonEmptyString }
addStyleDictAndClassName (StyleDict styleDictRec) viewStyle animation =
  let
    classNameHashValue :: Hash.Sha256HashValue
    classNameHashValue = viewStyleToSha256HashValue viewStyle

    className :: NonEmptyString
    className = sha256HashValueToClassName classNameHashValue
  in
    { styleDict:
        StyleDict
          { style: Map.insert classNameHashValue viewStyle styleDictRec.style
          , keyframes: Map.union styleDictRec.keyframes animation
          }
    , className
    }

listStyleDictToStyleDict :: Array StyleDict -> StyleDict
listStyleDictToStyleDict styleDictArray =
  StyleDict
    { style: Map.fromFoldable (Array.concatMap (\(StyleDict { style }) -> Map.toUnfoldable style) styleDictArray)
    , keyframes:
        Map.fromFoldable
          ( Array.concatMap
              ( \(StyleDict { keyframes }) ->
                  Map.toUnfoldable keyframes
              )
              styleDictArray
          )
    }

viewStyleToSha256HashValue :: Data.ViewStyle -> Hash.Sha256HashValue
viewStyleToSha256HashValue (Data.ViewStyle { normal, hover }) =
  Hash.stringToSha256HashValue
    ( String.joinWith "!"
        [ Css.declarationListToString normal
        , Css.declarationListToString hover
        ]
    )

toCssStatementList ::
  StyleDict ->
  Css.StatementList
toCssStatementList (StyleDict { keyframes, style }) =
  Css.StatementList
    { ruleList:
        Array.concat
          [ [ Css.Rule
                { selector: Css.Type { elementName: HtmlWellknown.htmlTagName }
                , declarationList: [ Css.height100Percent ]
                }
            , Css.Rule
                { selector: Css.Type { elementName: HtmlWellknown.bodyTagName }
                , declarationList:
                    [ Css.height100Percent
                    , Css.margin0
                    , Css.backgroundColor Color.black
                    , Css.displayGrid
                    , Css.boxSizingBorderBox
                    , Css.alignItems Css.Start
                    ]
                }
            ]
          , Array.concatMap
              styleDictItemToCssRuleList
              (Map.toUnfoldable style)
          ]
    , keyframesList:
        Prelude.map
          ( \(Tuple.Tuple hashValue keyframeList) ->
              Css.Keyframes
                { name: sha256HashValueToAnimationName hashValue
                , keyframeList
                }
          )
          (Map.toUnfoldable keyframes)
    }

styleDictItemToCssRuleList :: Tuple.Tuple Hash.Sha256HashValue Data.ViewStyle -> Array Css.Rule
styleDictItemToCssRuleList (Tuple.Tuple hashValue (Data.ViewStyle { normal, hover })) =
  Array.concat
    [ if Array.null normal then
        []
      else
        [ Css.Rule
            { selector:
                Css.Class
                  { className: sha256HashValueToClassName hashValue
                  , isHover: false
                  }
            , declarationList: normal
            }
        ]
    , if Array.null hover then
        []
      else
        [ Css.Rule
            { selector:
                Css.Class
                  { className: sha256HashValueToClassName hashValue
                  , isHover: true
                  }
            , declarationList: hover
            }
        ]
    ]

sha256HashValueToClassName :: Hash.Sha256HashValue -> NonEmptyString
sha256HashValueToClassName sha256HashValue =
  NonEmptyString.prependString
    "nv_"
    (Hash.toNonEmptyString sha256HashValue)

sha256HashValueToAnimationName :: Hash.Sha256HashValue -> NonEmptyString
sha256HashValueToAnimationName sha256HashValue =
  NonEmptyString.prependString
    "nva_"
    (Hash.toNonEmptyString sha256HashValue)
