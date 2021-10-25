module MediaType
  ( MediaType(..)
  , toMimeType
  , htmlMimeType
  , javaScriptMimeType
  , pngMimeType
  ) where

import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy

-- | definy, ナルミンチョの創作記録で扱う http のレスポンスで返す content-type の値
data MediaType
  = Png
  | JavaScript
  | Html
  | Json

toMimeType :: Maybe.Maybe MediaType -> NonEmptyString.NonEmptyString
toMimeType = case _ of
  Maybe.Just Png -> pngMimeType
  Maybe.Just JavaScript -> javaScriptMimeType
  Maybe.Just Html -> htmlMimeType
  Maybe.Just Json ->
    NonEmptyString.nes
      (Proxy.Proxy :: Proxy.Proxy "application/json")
  Maybe.Nothing ->
    NonEmptyString.nes
      (Proxy.Proxy :: Proxy.Proxy "application/octet-stream")

htmlMimeType :: NonEmptyString.NonEmptyString
htmlMimeType =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "text/html")

javaScriptMimeType :: NonEmptyString.NonEmptyString
javaScriptMimeType =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "text/javascript")

pngMimeType :: NonEmptyString.NonEmptyString
pngMimeType =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "image/png")
