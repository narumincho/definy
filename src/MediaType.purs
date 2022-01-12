module MediaType
  ( MediaType(..)
  , toMimeType
  , htmlMimeType
  , javaScriptMimeType
  , pngMimeType
  ) where

import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy (Proxy(..))

-- | definy, ナルミンチョの創作記録で扱う http のレスポンスで返す content-type の値
data MediaType
  = {- image/png -} Png
  | {- text/javascript -} JavaScript
  | {- text/html -} Html
  | {- application/json -} Json
  | {- font/woff2 -} WebOpenFontFormat2

toMimeType :: Maybe.Maybe MediaType -> NonEmptyString
toMimeType = case _ of
  Maybe.Just Png -> pngMimeType
  Maybe.Just JavaScript -> javaScriptMimeType
  Maybe.Just Html -> htmlMimeType
  Maybe.Just Json ->
    NonEmptyString.nes
      (Proxy :: _ "application/json")
  Maybe.Just WebOpenFontFormat2 ->
    NonEmptyString.nes
      (Proxy :: _ "font/woff2")
  Maybe.Nothing ->
    NonEmptyString.nes
      (Proxy :: _ "application/octet-stream")

htmlMimeType :: NonEmptyString
htmlMimeType =
  NonEmptyString.nes
    (Proxy :: _ "text/html")

javaScriptMimeType :: NonEmptyString
javaScriptMimeType =
  NonEmptyString.nes
    (Proxy :: _ "text/javascript")

pngMimeType :: NonEmptyString
pngMimeType =
  NonEmptyString.nes
    (Proxy :: _ "image/png")
