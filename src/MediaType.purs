module MediaType
  ( module MimeType
  , toMimeType
  ) where

import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import MimeType (MimeType(..), binary, html, javaScript, json, png, woff2) as MimeType

toMimeType :: Maybe.Maybe MimeType.MimeType -> NonEmptyString
toMimeType = case _ of
  Maybe.Just MimeType.Png -> MimeType.png
  Maybe.Just MimeType.JavaScript -> MimeType.javaScript
  Maybe.Just MimeType.Html -> MimeType.html
  Maybe.Just MimeType.Json -> MimeType.json
  Maybe.Just MimeType.WebOpenFontFormat2 -> MimeType.woff2
  Maybe.Nothing -> MimeType.binary
