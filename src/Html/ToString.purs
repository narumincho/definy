module Html.ToString (htmlOptionToString) where

import Color as Color
import Data.Array as Array
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String as String
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
  Data.htmlElement
    "html"
    ( case option.language of
        Maybe.Just language ->
          Map.singleton
            "lang"
            (Maybe.Just (languageToIETFLanguageTag language))
        Maybe.Nothing -> Map.empty
    )
    ( Data.ElementList
        [ headElement htmlOption
        , Data.htmlElement
            "body"
            ( case option.bodyClass of
                Maybe.Just bodyClass -> Map.singleton "class" (Maybe.Just bodyClass)
                Maybe.Nothing -> Map.empty
            )
            ( Data.ElementList
                ( Array.concat
                    [ [ Data.htmlElement
                          "noscript"
                          Map.empty
                          ( Data.Text
                              ( Prelude.append
                                  option.appName
                                  " では JavaScript を使用します. ブラウザの設定で有効にしてください."
                              )
                          )
                      ]
                    , option.bodyChildren
                    ]
                )
            )
        ]
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
  Data.htmlElement
    "head"
    Map.empty
    ( Data.ElementList
        ( Array.concat
            [ [ charsetElement
              , viewportElement
              , pageNameElement option.pageName
              , descriptionElement option.description
              , themeColorElement option.themeColor
              ]
            , [ iconElement (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: option.iconPath }) ]
            , case option.style of
                Maybe.Just style -> [ cssStyleElement style ]
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
                Maybe.Just scriptPath -> [ javaScriptElementByUrl (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: scriptPath }) ]
                Maybe.Nothing -> []
            ]
        )
    )

charsetElement :: Data.HtmlElement
charsetElement =
  Data.htmlElement "meta"
    (Map.singleton "charset" (Maybe.Just "utf-8"))
    Data.NoEndTag

viewportElement :: Data.HtmlElement
viewportElement =
  Data.htmlElement
    "meta"
    ( Map.fromFoldable
        [ Tuple.Tuple "name" (Maybe.Just "viewport")
        , Tuple.Tuple
            "content"
            ( Maybe.Just
                "width=device-width,initial-scale=1.0"
            )
        ]
    )
    Data.NoEndTag

pageNameElement :: String -> Data.HtmlElement
pageNameElement pageName = Data.htmlElement "title" Map.empty (Data.Text pageName)

descriptionElement :: String -> Data.HtmlElement
descriptionElement description =
  Data.htmlElement
    "meta"
    ( Map.fromFoldable
        [ Tuple.Tuple "name" (Maybe.Just "description")
        , Tuple.Tuple "content" (Maybe.Just description)
        ]
    )
    Data.NoEndTag

themeColorElement :: Color.Color -> Data.HtmlElement
themeColorElement themeColor =
  Data.htmlElement
    "meta"
    ( Map.fromFoldable
        [ Tuple.Tuple "name" (Maybe.Just "theme-color")
        , Tuple.Tuple "content" (Maybe.Just (Color.toHexString themeColor))
        ]
    )
    Data.NoEndTag

iconElement :: StructuredUrl.StructuredUrl -> Data.HtmlElement
iconElement iconUrl =
  Data.htmlElement
    "link"
    ( Map.fromFoldable
        [ Tuple.Tuple "rel" (Maybe.Just "icon")
        , Tuple.Tuple "href" (Maybe.Just (StructuredUrl.toString iconUrl))
        ]
    )
    Data.NoEndTag

cssStyleElement :: String -> Data.HtmlElement
cssStyleElement cssCode = Data.htmlElement "style" Map.empty (Data.RawText cssCode)

twitterCardElement :: Data.TwitterCard -> Data.HtmlElement
twitterCardElement twitterCard =
  Data.htmlElement
    "meta"
    ( Map.fromFoldable
        ( [ Tuple.Tuple "name" (Maybe.Just "twitter:card")
          , Tuple.Tuple "content" (Maybe.Just (twitterCardToString twitterCard))
          ]
        )
    )
    Data.NoEndTag

ogUrlElement :: StructuredUrl.StructuredUrl -> Data.HtmlElement
ogUrlElement url =
  Data.htmlElement
    "meta"
    ( Map.fromFoldable
        [ Tuple.Tuple "property" (Maybe.Just "og:url")
        , Tuple.Tuple "content"
            (Maybe.Just (StructuredUrl.toString url))
        ]
    )
    Data.NoEndTag

ogTitleElement :: String -> Data.HtmlElement
ogTitleElement title =
  Data.htmlElement
    "meta"
    ( Map.fromFoldable
        [ Tuple.Tuple "property" (Maybe.Just "og:title")
        , Tuple.Tuple "content" (Maybe.Just title)
        ]
    )
    Data.NoEndTag

ogSiteName :: String -> Data.HtmlElement
ogSiteName siteName =
  Data.htmlElement
    "meta"
    ( Map.fromFoldable
        [ Tuple.Tuple "property" (Maybe.Just "og:site_name")
        , Tuple.Tuple "content" (Maybe.Just siteName)
        ]
    )
    Data.NoEndTag

ogDescription :: String -> Data.HtmlElement
ogDescription description =
  Data.htmlElement
    "meta"
    ( Map.fromFoldable
        [ Tuple.Tuple "property" (Maybe.Just "og:description")
        , Tuple.Tuple "content" (Maybe.Just description)
        ]
    )
    Data.NoEndTag

ogImage :: StructuredUrl.StructuredUrl -> Data.HtmlElement
ogImage url =
  Data.htmlElement
    "meta"
    ( Map.fromFoldable
        [ Tuple.Tuple "property" (Maybe.Just "og:image")
        , Tuple.Tuple "content" (Maybe.Just (StructuredUrl.toString url))
        ]
    )
    Data.NoEndTag

javaScriptElementByUrl :: StructuredUrl.StructuredUrl -> Data.HtmlElement
javaScriptElementByUrl url =
  Data.htmlElement
    "script"
    ( Map.fromFoldable
        [ Tuple.Tuple "defer" Maybe.Nothing
        , Tuple.Tuple "src" (Maybe.Just (StructuredUrl.toString url))
        ]
    )
    (Data.ElementList [])

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
      ( String.joinWith ""
          ( Prelude.map
              ( \(Tuple.Tuple key value) -> case value of
                  Maybe.Just v -> String.joinWith "" [ key, "=\"", escapeInHtml v, "\"" ]
                  Maybe.Nothing -> key
              )
              (Map.toUnfoldable attributeMap)
          )
      )
