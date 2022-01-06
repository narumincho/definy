module CreativeRecord.Element
  ( htmlCodeWithSyntaxHighlight
  , htmlCodeWithSyntaxHighlightFromSvg
  , inlineAnchorExternal
  , inlineAnchorLocal
  , paragraph
  , paragraphText
  , spanNormalText
  ) where

import Color as Color
import Color.Scheme.MaterialDesign as ColorMaterial
import CreativeRecord.Location as Location
import CreativeRecord.Message as Message
import Css as Css
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Html.Data as HtmlData
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Util as Util
import Vdom.ToHtml as VdomToHtml
import Vdom.VdomPicked as VdomPicked
import View.Data as ViewData
import View.Helper as ViewHelper
import View.ToVdom as ViewToVdom

paragraphText :: String -> ViewData.ElementAndStyle Message.Message Location.Location
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

paragraph :: Array (ViewData.ElementAndStyle Message.Message Location.Location) -> ViewData.ElementAndStyle Message.Message Location.Location
paragraph children =
  ViewHelper.div
    { style:
        ViewData.createStyle {}
          [ Css.color Color.white
          , Css.padding { leftRight: 0.5, topBottom: 0.5 }
          ]
    }
    children

spanNormalText :: String -> ViewData.ElementAndStyle Message.Message Location.Location
spanNormalText textValue =
  ViewHelper.span
    { style:
        ViewData.createStyle {}
          [ Css.color Color.white
          , Css.fontSize 1.2
          ]
    }
    textValue

inlineAnchorLocal :: Location.Location -> String -> ViewData.ElementAndStyle Message.Message Location.Location
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

inlineAnchorExternal :: StructuredUrl.StructuredUrl -> String -> ViewData.ElementAndStyle Message.Message Location.Location
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

htmlCodeWithSyntaxHighlightFromSvg :: ViewData.Svg -> ViewData.ElementAndStyle Message.Message Location.Location
htmlCodeWithSyntaxHighlightFromSvg svg =
  let
    (ViewToVdom.ElementAndStyleDict { element }) = ViewToVdom.svgToHtmlElement svg
  in
    htmlCodeWithSyntaxHighlight
      ( VdomToHtml.vdomElementToHtmlElement
          { origin: NonEmptyString.nes (Proxy :: _ "https://example.com")
          , element:
              VdomPicked.ElementAndClass
                { element, id: Nothing, class: Nothing }
          , locationToPathAndSearchParams: \_ -> StructuredUrl.fromPath []
          }
      )

-- | html のコードをシンタックスハイライト付きのコードの vdom に変換する.
-- | 厳密な話では, 見やすさのためにインデント分のテキストノードが入ってしまうが... 気にしない
htmlCodeWithSyntaxHighlight :: HtmlData.RawHtmlElement -> ViewData.ElementAndStyle Message.Message Location.Location
htmlCodeWithSyntaxHighlight htmlElement =
  ViewData.ElementAndStyle
    { style:
        ViewData.createStyle {}
          [ Css.whiteSpacePreWrap, Css.fontSize 1.1 ]
    , element:
        ViewData.ElementCode
          ( ViewData.Code
              { children:
                  ViewData.ElementListOrTextElementList
                    ( htmlCodeWithSyntaxHighlightLoopWithEndNewLine
                        { keyPrefix: ""
                        , indent: UInt.fromInt 0
                        , html: htmlElement
                        }
                    )
              , click: Nothing
              , id: Nothing
              }
          )
    }

htmlCodeWithSyntaxHighlightLoopWithEndNewLine ::
  { indent :: UInt.UInt
  , html :: HtmlData.RawHtmlElement
  , keyPrefix :: String
  } ->
  NonEmptyArray (ViewData.KeyAndElement Message.Message Location.Location)
htmlCodeWithSyntaxHighlightLoopWithEndNewLine option@{ keyPrefix } =
  NonEmptyArray.snoc
    (htmlCodeWithSyntaxHighlightLoop option)
    ( ViewData.KeyAndElement
        { key: Prelude.append keyPrefix "end-new-line"
        , element:
            ViewHelper.span
              { style: ViewData.createStyle {} [] }
              "\n"
        }
    )

htmlCodeWithSyntaxHighlightLoop ::
  { indent :: UInt.UInt
  , html :: HtmlData.RawHtmlElement
  , keyPrefix :: String
  } ->
  NonEmptyArray (ViewData.KeyAndElement Message.Message Location.Location)
htmlCodeWithSyntaxHighlightLoop { indent, html: HtmlData.RawHtmlElement { name, attributes, children }, keyPrefix } =
  let
    indentElement =
      ViewHelper.span
        { style: ViewData.createStyle {} [] }
        (Util.stringRepeat indent "  ")
  in
    NonEmptyArray.cons'
      ( ViewData.KeyAndElement
          { key: Prelude.append keyPrefix "start-indent"
          , element: indentElement
          }
      )
      ( Array.concat
          [ NonEmptyArray.toArray
              ( htmlCodeWithSyntaxHighlightLoopStartTag keyPrefix
                  name
                  attributes
              )
          , case children of
              HtmlData.ElementList list -> case NonEmptyArray.fromArray list of
                Just _ ->
                  Array.concat
                    [ [ ViewData.KeyAndElement
                          { key: Prelude.append keyPrefix "new-line"
                          , element:
                              ViewHelper.span
                                { style: ViewData.createStyle {} [] }
                                "\n"
                          }
                      ]
                    , Array.concat
                        ( Array.mapWithIndex
                            ( \index child ->
                                NonEmptyArray.toArray
                                  ( htmlCodeWithSyntaxHighlightLoopWithEndNewLine
                                      { indent: Prelude.add indent (UInt.fromInt 1)
                                      , html: child
                                      , keyPrefix:
                                          String.joinWith ""
                                            [ keyPrefix
                                            , "element-"
                                            , Prelude.show index
                                            , "-"
                                            ]
                                      }
                                  )
                            )
                            list
                        )
                    , [ ViewData.KeyAndElement
                          { key: Prelude.append keyPrefix "end-indent"
                          , element: indentElement
                          }
                      ]
                    , NonEmptyArray.toArray (htmlCodeWithSyntaxHighlightLoopEndTag name)
                    ]
                Nothing -> NonEmptyArray.toArray (htmlCodeWithSyntaxHighlightLoopEndTag name)
              HtmlData.Text text ->
                Array.cons
                  ( ViewData.KeyAndElement
                      { key: Prelude.append keyPrefix "text-node"
                      , element:
                          ViewHelper.span
                            { style: ViewData.createStyle {} [] }
                            text
                      }
                  )
                  (NonEmptyArray.toArray (htmlCodeWithSyntaxHighlightLoopEndTag name))
              HtmlData.RawText text ->
                Array.cons
                  ( ViewData.KeyAndElement
                      { key: Prelude.append keyPrefix "raw-text-node"
                      , element:
                          ViewHelper.span
                            { style: ViewData.createStyle {} [] }
                            text
                      }
                  )
                  (NonEmptyArray.toArray (htmlCodeWithSyntaxHighlightLoopEndTag name))
              HtmlData.NoEndTag -> []
          ]
      )

htmlCodeWithSyntaxHighlightLoopStartTag ::
  String ->
  NonEmptyString ->
  Map.Map NonEmptyString (Maybe String) ->
  NonEmptyArray (ViewData.KeyAndElement Message.Message Location.Location)
htmlCodeWithSyntaxHighlightLoopStartTag keyPrefix name attributes =
  NonEmptyArray.cons'
    (codeSymbol (Prelude.append keyPrefix "start-tag-less-than-sign") "<")
    ( Array.concat
        [ [ ViewData.KeyAndElement
              { key: "start-tag-name"
              , element:
                  ViewHelper.span
                    { style:
                        ViewData.createStyle {}
                          [ Css.color (Color.rgb 86 156 214) ]
                    }
                    (NonEmptyString.toString name)
              }
          ]
        , htmlCodeWithSyntaxHighlightLoopAttributes keyPrefix attributes
        , [ codeSymbol
              (Prelude.append keyPrefix "start-tag-greater-than-sign")
              ">"
          ]
        ]
    )

htmlCodeWithSyntaxHighlightLoopAttributes ::
  String ->
  Map.Map NonEmptyString (Maybe String) ->
  Array (ViewData.KeyAndElement Message.Message Location.Location)
htmlCodeWithSyntaxHighlightLoopAttributes keyPrefix attributeMap =
  if Map.isEmpty attributeMap then
    []
  else
    Array.concatMap
      ( \(Tuple.Tuple key value) ->
          htmlCodeWithSyntaxHighlightLoopAttributeWithStartSpace keyPrefix key value
      )
      (Map.toUnfoldable attributeMap)

htmlCodeWithSyntaxHighlightLoopAttributeWithStartSpace ::
  String ->
  NonEmptyString ->
  Maybe String ->
  Array (ViewData.KeyAndElement Message.Message Location.Location)
htmlCodeWithSyntaxHighlightLoopAttributeWithStartSpace keyPrefix key value =
  Array.cons
    ( ViewData.KeyAndElement
        { key:
            String.joinWith ""
              [ keyPrefix
              , "attribute-"
              , NonEmptyString.toString key
              , "-start-space"
              ]
        , element:
            ViewHelper.span
              { style: ViewData.createStyle {} [] }
              " "
        }
    )
    (htmlCodeWithSyntaxHighlightLoopAttribute keyPrefix key value)

htmlCodeWithSyntaxHighlightLoopAttribute ::
  String ->
  NonEmptyString ->
  Maybe String ->
  Array (ViewData.KeyAndElement Message.Message Location.Location)
htmlCodeWithSyntaxHighlightLoopAttribute keyPrefix key =
  let
    vdomKeyPrefix :: String
    vdomKeyPrefix =
      String.joinWith ""
        [ keyPrefix
        , "attribute-"
        , NonEmptyString.toString key
        ]

    keyElement =
      ViewData.KeyAndElement
        { key: Prelude.append vdomKeyPrefix "-key"
        , element:
            ViewHelper.span
              { style: ViewData.createStyle {} [ Css.color (Color.rgb 156 220 254) ] }
              (NonEmptyString.toString key)
        }
  in
    case _ of
      Just value ->
        [ keyElement
        , codeSymbol (Prelude.append vdomKeyPrefix "-eq-and-start-quotation") "=\""
        -- エスケープとその表示は必要になったら対応
        , ViewData.KeyAndElement
            { key: Prelude.append vdomKeyPrefix "-value"
            , element:
                ViewHelper.span
                  { style: ViewData.createStyle {} [ Css.color (Color.rgb 206 145 120) ] }
                  value
            }
        , codeSymbol (Prelude.append vdomKeyPrefix "-end-quotation") "\""
        ]
      Nothing -> [ keyElement ]

htmlCodeWithSyntaxHighlightLoopEndTag ::
  NonEmptyString ->
  NonEmptyArray (ViewData.KeyAndElement Message.Message Location.Location)
htmlCodeWithSyntaxHighlightLoopEndTag name =
  NonEmptyArray.cons'
    (codeSymbol "end-tag-less-than-and-solidus-sign" "</")
    [ ViewData.KeyAndElement
        { key: "end-tag-name"
        , element:
            ViewHelper.span
              { style:
                  ViewData.createStyle {}
                    [ Css.color (Color.rgb 86 156 214) ]
              }
              (NonEmptyString.toString name)
        }
    , codeSymbol "end-tag-greater-than-sign" ">"
    ]

codeSymbol :: String -> String -> ViewData.KeyAndElement Message.Message Location.Location
codeSymbol key symbol =
  ViewData.KeyAndElement
    { key: key
    , element:
        ViewHelper.span
          { style: ViewData.createStyle {} [ Css.color (Color.rgb 128 128 128) ] }
          symbol
    }
