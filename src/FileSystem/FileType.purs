module FileSystem.FileType
  ( FileType(..)
  , toExtension
  , fromExtension
  , toMediaType
  ) where

import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import MediaType as MediaType
import Type.Proxy as Proxy
import Prelude as Prelude
import Data.Show.Generic as ShowGeneric
import Data.Generic.Rep as GenericRep

-- | ファイルシステムで読み書きするファイル
data FileType
  = Png
  | TypeScript
  | PureScript
  | JavaScript
  | Html
  | Json
  | FirebaseSecurityRules

derive instance eqFileType :: Prelude.Eq FileType

derive instance genericFileType :: GenericRep.Generic FileType _

instance showFileType :: Prelude.Show FileType where
  show = ShowGeneric.genericShow

toExtension :: FileType -> NonEmptyString.NonEmptyString
toExtension = case _ of
  Png -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "png")
  TypeScript -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ts")
  JavaScript -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "js")
  Html -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "html")
  Json -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "json")
  PureScript -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "purs")
  FirebaseSecurityRules -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "rules")

fromExtension :: String -> Maybe.Maybe FileType
fromExtension = case _ of
  "png" -> Maybe.Just Png
  "ts" -> Maybe.Just TypeScript
  "js" -> Maybe.Just JavaScript
  "html" -> Maybe.Just Html
  "json" -> Maybe.Just Json
  "purs" -> Maybe.Just PureScript
  "rules" -> Maybe.Just FirebaseSecurityRules
  _ -> Maybe.Nothing

toMediaType :: FileType -> Maybe.Maybe MediaType.MediaType
toMediaType = case _ of
  Png -> Maybe.Just MediaType.Png
  TypeScript -> Maybe.Nothing
  JavaScript -> Maybe.Just MediaType.JavaScript
  Html -> Maybe.Just MediaType.Html
  Json -> Maybe.Just MediaType.Json
  PureScript -> Maybe.Nothing
  FirebaseSecurityRules -> Maybe.Nothing
