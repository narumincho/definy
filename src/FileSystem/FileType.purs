module FileSystem.FileType
  ( FileType(..)
  , toExtension
  , fromExtension
  , toMediaType
  ) where

import Data.Generic.Rep as GenericRep
import Data.Maybe as Maybe
import Data.Show.Generic as ShowGeneric
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import MediaType as MediaType
import Prelude as Prelude
import Type.Proxy (Proxy(..))

-- | ファイルシステムで読み書きするファイル
data FileType
  = Png
  | TypeScript
  | PureScript
  | JavaScript
  | TypeScriptReact
  | Html
  | Json
  | FirebaseSecurityRules
  | Markdown
  | WebOpenFontFormat2

derive instance eqFileType :: Prelude.Eq FileType

derive instance genericFileType :: GenericRep.Generic FileType _

instance showFileType :: Prelude.Show FileType where
  show = ShowGeneric.genericShow

toExtension :: FileType -> NonEmptyString
toExtension = case _ of
  Png -> NonEmptyString.nes (Proxy :: _ "png")
  TypeScript -> NonEmptyString.nes (Proxy :: _ "ts")
  TypeScriptReact -> NonEmptyString.nes (Proxy :: _ "tsx")
  JavaScript -> NonEmptyString.nes (Proxy :: _ "js")
  Html -> NonEmptyString.nes (Proxy :: _ "html")
  Json -> NonEmptyString.nes (Proxy :: _ "json")
  PureScript -> NonEmptyString.nes (Proxy :: _ "purs")
  FirebaseSecurityRules -> NonEmptyString.nes (Proxy :: _ "rules")
  Markdown -> NonEmptyString.nes (Proxy :: _ "md")
  WebOpenFontFormat2 -> NonEmptyString.nes (Proxy :: _ "woff2")

fromExtension :: String -> Maybe.Maybe FileType
fromExtension = case _ of
  "png" -> Maybe.Just Png
  "ts" -> Maybe.Just TypeScript
  "tsx" -> Maybe.Just TypeScriptReact
  "js" -> Maybe.Just JavaScript
  "html" -> Maybe.Just Html
  "json" -> Maybe.Just Json
  "purs" -> Maybe.Just PureScript
  "rules" -> Maybe.Just FirebaseSecurityRules
  "md" -> Maybe.Just Markdown
  "woff2" -> Maybe.Just WebOpenFontFormat2
  _ -> Maybe.Nothing

toMediaType :: FileType -> Maybe.Maybe MediaType.MimeType
toMediaType = case _ of
  Png -> Maybe.Just MediaType.Png
  TypeScript -> Maybe.Nothing
  TypeScriptReact -> Maybe.Nothing
  JavaScript -> Maybe.Just MediaType.JavaScript
  Html -> Maybe.Just MediaType.Html
  Json -> Maybe.Just MediaType.Json
  PureScript -> Maybe.Nothing
  FirebaseSecurityRules -> Maybe.Nothing
  Markdown -> Maybe.Nothing
  WebOpenFontFormat2 -> Maybe.Just MediaType.WebOpenFontFormat2
