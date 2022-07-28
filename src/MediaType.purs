module MediaType
  ( module MimeTypeModule
  , toMimeType
  ) where

import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import MimeType (MimeType(..), binary, html, javaScript, json, png, woff2) as MimeTypeModule

toMimeType :: Maybe.Maybe MimeTypeModule.MimeType -> NonEmptyString
toMimeType = case _ of
  Maybe.Just MimeTypeModule.Png -> MimeTypeModule.png
  Maybe.Just MimeTypeModule.JavaScript -> MimeTypeModule.javaScript
  Maybe.Just MimeTypeModule.Html -> MimeTypeModule.html
  Maybe.Just MimeTypeModule.Json -> MimeTypeModule.json
  Maybe.Just MimeTypeModule.WebOpenFontFormat2 -> MimeTypeModule.woff2
  Maybe.Nothing -> MimeTypeModule.binary
