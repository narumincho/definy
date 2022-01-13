module Html.ToString (toString) where

import Data.Array as Array
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Html.Data as Data
import Prelude as Prelude

escapeInHtml :: String -> String
escapeInHtml text =
  String.replaceAll (String.Pattern "`") (String.Replacement "&#x60;")
    ( String.replaceAll (String.Pattern "'") (String.Replacement "&#x27;")
        ( String.replaceAll (String.Pattern "\"") (String.Replacement "&quot;")
            ( String.replaceAll (String.Pattern "<") (String.Replacement "&lt;")
                ( String.replaceAll (String.Pattern ">") (String.Replacement "&gt;")
                    (String.replaceAll (String.Pattern "&") (String.Replacement "&amp;") text)
                )
            )
        )
    )

-- | 文字列の HTML を生成する. 
-- | ```html
-- | <!doctype html>
-- | ```
-- | を先頭に結合する
toString :: Data.RawHtmlElement -> String
toString htmlElement =
  Prelude.append
    "<!doctype html>"
    (htmlElementToString htmlElement)

htmlElementToString :: Data.RawHtmlElement -> String
htmlElementToString (Data.RawHtmlElement element) =
  let
    startTag =
      String.joinWith ""
        [ "<"
        , NonEmptyString.toString element.name
        , attributesToString (element.attributes)
        , ">"
        ]

    endTag = String.joinWith "" [ "</", NonEmptyString.toString element.name, ">" ]
  in
    String.joinWith ""
      ( Array.concat
          [ [ startTag ]
          , case element.children of
              Data.ElementList list ->
                [ String.joinWith "" (Prelude.map htmlElementToString list)
                , endTag
                ]
              Data.Text text -> [ escapeInHtml text, endTag ]
              Data.RawText text -> [ text, endTag ]
              Data.NoEndTag -> []
          ]
      )

attributesToString :: Map.Map NonEmptyString (Maybe.Maybe String) -> String
attributesToString attributeMap =
  if Map.isEmpty attributeMap then
    ""
  else
    Prelude.append " "
      ( String.joinWith " "
          ( Prelude.map
              ( \(Tuple.Tuple key value) -> case value of
                  Maybe.Just v ->
                    String.joinWith ""
                      [ NonEmptyString.toString key
                      , "=\""
                      , escapeInHtml v
                      , "\""
                      ]
                  Maybe.Nothing -> NonEmptyString.toString key
              )
              (Map.toUnfoldable attributeMap)
          )
      )
