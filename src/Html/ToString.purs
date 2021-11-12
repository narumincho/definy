module Html.ToString (htmlOptionToString) where

import Color as Color
import Data.Array as Array
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Html.Data as Data
import Html.Wellknown as Wellknown
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy

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
  Wellknown.html
    (Prelude.map languageToIETFLanguageTag option.language)
    (headElement htmlOption)
    ( Wellknown.body
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
  Wellknown.noscript
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
  Wellknown.head
    ( Data.ElementList
        ( Array.concat
            [ [ charsetElement
              , viewportElement
              , Wellknown.title option.pageName
              , descriptionElement option.description
              , themeColorElement option.themeColor
              ]
            , iconElement (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: option.iconPath })
            , [ Wellknown.style option.style
              , twitterCardElement option.twitterCard
              ]
            , case option.path of
                Maybe.Just path -> [ ogUrlElement (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: path }) ]
                Maybe.Nothing -> []
            , [ ogTitleElement option.pageName
              , ogSiteName option.appName
              , ogDescription option.description
              , ogImage (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: option.coverImagePath })
              ]
            , case option.scriptPath of
                Maybe.Just scriptPath -> [ Wellknown.script (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: scriptPath }) ]
                Maybe.Nothing -> []
            ]
        )
    )

charsetElement :: Data.HtmlElement
charsetElement =
  Wellknown.meta
    (Map.singleton (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "charset")) (Maybe.Just "utf-8"))

viewportElement :: Data.HtmlElement
viewportElement =
  Wellknown.meta
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "name"))
            (Maybe.Just "viewport")
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "content"))
            ( Maybe.Just
                "width=device-width,initial-scale=1.0"
            )
        ]
    )

descriptionElement :: String -> Data.HtmlElement
descriptionElement description =
  Wellknown.meta
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "name"))
            (Maybe.Just "description")
        , contentAttribute description
        ]
    )

themeColorElement :: Color.Color -> Data.HtmlElement
themeColorElement themeColor =
  Wellknown.meta
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "name"))
            (Maybe.Just "theme-color")
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "content"))
            (Maybe.Just (Color.toHexString themeColor))
        ]
    )

iconElement :: StructuredUrl.StructuredUrl -> Array Data.HtmlElement
iconElement iconUrl =
  let
    href :: String
    href = NonEmptyString.toString (StructuredUrl.toString iconUrl)
  in
    [ Wellknown.link "icon" href
    , Wellknown.link "apple-touch-icon" href
    ]

twitterCardElement :: Data.TwitterCard -> Data.HtmlElement
twitterCardElement twitterCard =
  Wellknown.meta
    ( Map.fromFoldable
        ( [ Tuple.Tuple
              (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "name"))
              (Maybe.Just "twitter:card")
          , Tuple.Tuple
              (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "content"))
              (Maybe.Just (twitterCardToString twitterCard))
          ]
        )
    )

propertyAttribute :: String -> Tuple.Tuple NonEmptyString.NonEmptyString (Maybe.Maybe String)
propertyAttribute value =
  Tuple.Tuple
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "property"))
    (Maybe.Just value)

contentAttribute :: String -> Tuple.Tuple NonEmptyString.NonEmptyString (Maybe.Maybe String)
contentAttribute value =
  Tuple.Tuple
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "content"))
    (Maybe.Just value)

ogUrlElement :: StructuredUrl.StructuredUrl -> Data.HtmlElement
ogUrlElement url =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:url"
        , contentAttribute (NonEmptyString.toString (StructuredUrl.toString url))
        ]
    )

ogTitleElement :: NonEmptyString.NonEmptyString -> Data.HtmlElement
ogTitleElement title =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:title"
        , contentAttribute (NonEmptyString.toString title)
        ]
    )

ogSiteName :: NonEmptyString.NonEmptyString -> Data.HtmlElement
ogSiteName siteName =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:site_name"
        , contentAttribute (NonEmptyString.toString siteName)
        ]
    )

ogDescription :: String -> Data.HtmlElement
ogDescription description =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:description"
        , contentAttribute description
        ]
    )

ogImage :: StructuredUrl.StructuredUrl -> Data.HtmlElement
ogImage url =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:image"
        , contentAttribute (NonEmptyString.toString (StructuredUrl.toString url))
        ]
    )

htmlElementToString :: Data.HtmlElement -> String
htmlElementToString (Data.HtmlElement element) =
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

attributesToString :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> String
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
