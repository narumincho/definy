module MediaType
  ( MediaType(..)
  , toMimeType
  ) where

import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import MimeType as MimeType

-- | definy, ナルミンチョの創作記録で扱う http のレスポンスで返す content-type の値
data MediaType
  = {- image/png -} Png
  | {- text/javascript -} JavaScript
  | {- text/html -} Html
  | {- application/json -} Json
  | {- font/woff2 -} WebOpenFontFormat2

toMimeType :: Maybe.Maybe MediaType -> NonEmptyString
toMimeType = case _ of
  Maybe.Just Png -> MimeType.png
  Maybe.Just JavaScript -> MimeType.javaScript
  Maybe.Just Html -> MimeType.html
  Maybe.Just Json -> MimeType.json
  Maybe.Just WebOpenFontFormat2 -> MimeType.woff2
  Maybe.Nothing -> MimeType.binary
