module Html.ToString (htmlOptionToString) where

import Color as Color
import Data.Array as Array
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Html.Data as Data
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl

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

languageToIETFLanguageTag :: Language.Language -> String
languageToIETFLanguageTag = case _ of
  Language.Japanese -> "ja"
  Language.English -> "en"
  Language.Esperanto -> "eo"

twitterCardToString :: Data.TwitterCard -> String
twitterCardToString = case _ of
  Data.SummaryCard -> "summary"
  Data.SummaryCardWithLargeImage -> "summary_large_image"

htmlOptionToHtmlHtmlElement :: Data.HtmlOption -> Data.HtmlElement
htmlOptionToHtmlHtmlElement htmlOption@(Data.HtmlOption option) =
  Data.html
    (Prelude.map languageToIETFLanguageTag option.language)
    (headElement htmlOption)
    ( Data.body
        option.bodyClass
        ( Data.ElementList
            ( Array.cons
                (noScriptElement option.appName)
                option.bodyChildren
            )
        )
    )

noScriptElement :: NonEmptyString.NonEmptyString -> Data.HtmlElement
noScriptElement appName =
  Data.noscript
    ( Data.Text
        ( Prelude.append
            (NonEmptyString.toString appName)
            " では JavaScript を使用します. ブラウザの設定で有効にしてください."
        )
    )

-- | 文字列の HTML を生成する
htmlOptionToString :: Data.HtmlOption -> String
htmlOptionToString htmlOption =
  Prelude.append
    "<!doctype html>"
    ( htmlElementToString
        (htmlOptionToHtmlHtmlElement htmlOption)
    )

headElement :: Data.HtmlOption -> Data.HtmlElement
headElement (Data.HtmlOption option) =
  Data.head
    ( Data.ElementList
        ( Array.concat
            [ [ charsetElement
              , viewportElement
              , Data.title option.pageName
              , descriptionElement option.description
              , themeColorElement option.themeColor
              ]
            , [ iconElement (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: option.iconPath }) ]
            , case option.style of
                Maybe.Just style -> [ Data.style style ]
                Maybe.Nothing -> []
            , [ twitterCardElement option.twitterCard ]
            , case option.path of
                Maybe.Just path -> [ ogUrlElement (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: path }) ]
                Maybe.Nothing -> []
            , [ ogTitleElement option.pageName
              , ogSiteName option.appName
              , ogDescription option.description
              , ogImage (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: option.coverImagePath })
              ]
            , case option.scriptPath of
                Maybe.Just scriptPath -> [ Data.script (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: scriptPath }) ]
                Maybe.Nothing -> []
            ]
        )
    )

charsetElement :: Data.HtmlElement
charsetElement = Data.meta (Map.singleton "charset" (Maybe.Just "utf-8"))

viewportElement :: Data.HtmlElement
viewportElement =
  Data.meta
    ( Map.fromFoldable
        [ Tuple.Tuple "name" (Maybe.Just "viewport")
        , Tuple.Tuple
            "content"
            ( Maybe.Just
                "width=device-width,initial-scale=1.0"
            )
        ]
    )

descriptionElement :: String -> Data.HtmlElement
descriptionElement description =
  Data.meta
    ( Map.fromFoldable
        [ Tuple.Tuple "name" (Maybe.Just "description")
        , Tuple.Tuple "content" (Maybe.Just description)
        ]
    )

themeColorElement :: Color.Color -> Data.HtmlElement
themeColorElement themeColor =
  Data.meta
    ( Map.fromFoldable
        [ Tuple.Tuple "name" (Maybe.Just "theme-color")
        , Tuple.Tuple "content" (Maybe.Just (Color.toHexString themeColor))
        ]
    )

iconElement :: StructuredUrl.StructuredUrl -> Data.HtmlElement
iconElement iconUrl = Data.link "icon" (NonEmptyString.toString (StructuredUrl.toString iconUrl))

twitterCardElement :: Data.TwitterCard -> Data.HtmlElement
twitterCardElement twitterCard =
  Data.meta
    ( Map.fromFoldable
        ( [ Tuple.Tuple "name" (Maybe.Just "twitter:card")
          , Tuple.Tuple "content" (Maybe.Just (twitterCardToString twitterCard))
          ]
        )
    )

ogUrlElement :: StructuredUrl.StructuredUrl -> Data.HtmlElement
ogUrlElement url =
  Data.meta
    ( Map.fromFoldable
        [ Tuple.Tuple "property" (Maybe.Just "og:url")
        , Tuple.Tuple "content"
            (Maybe.Just (NonEmptyString.toString (StructuredUrl.toString url)))
        ]
    )

ogTitleElement :: NonEmptyString.NonEmptyString -> Data.HtmlElement
ogTitleElement title =
  Data.meta
    ( Map.fromFoldable
        [ Tuple.Tuple "property" (Maybe.Just "og:title")
        , Tuple.Tuple "content" (Maybe.Just (NonEmptyString.toString title))
        ]
    )

ogSiteName :: NonEmptyString.NonEmptyString -> Data.HtmlElement
ogSiteName siteName =
  Data.meta
    ( Map.fromFoldable
        [ Tuple.Tuple "property" (Maybe.Just "og:site_name")
        , Tuple.Tuple "content" (Maybe.Just (NonEmptyString.toString siteName))
        ]
    )

ogDescription :: String -> Data.HtmlElement
ogDescription description =
  Data.meta
    ( Map.fromFoldable
        [ Tuple.Tuple "property" (Maybe.Just "og:description")
        , Tuple.Tuple "content" (Maybe.Just description)
        ]
    )

ogImage :: StructuredUrl.StructuredUrl -> Data.HtmlElement
ogImage url =
  Data.meta
    ( Map.fromFoldable
        [ Tuple.Tuple "property" (Maybe.Just "og:image")
        , Tuple.Tuple "content" (Maybe.Just (NonEmptyString.toString (StructuredUrl.toString url)))
        ]
    )

htmlElementToString :: Data.HtmlElement -> String
htmlElementToString (Data.HtmlElement element) =
  let
    startTag = String.joinWith "" [ "<", element.name, attributesToString (element.attributes), ">" ]

    endTag = String.joinWith "" [ "</", element.name, ">" ]
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

attributesToString :: Map.Map String (Maybe.Maybe String) -> String
attributesToString attributeMap =
  if Map.isEmpty attributeMap then
    ""
  else
    Prelude.append " "
      ( String.joinWith " "
          ( Prelude.map
              ( \(Tuple.Tuple key value) -> case value of
                  Maybe.Just v -> String.joinWith "" [ key, "=\"", escapeInHtml v, "\"" ]
                  Maybe.Nothing -> key
              )
              (Map.toUnfoldable attributeMap)
          )
      )
