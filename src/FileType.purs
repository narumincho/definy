module FileType (FileType(..), toMimeType, textHtmlMimeType) where

import Data.Generic.Rep as GenericRep
import Data.Maybe as Maybe
import Data.Show.Generic as ShowGeneric
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude
import Type.Proxy as Proxy

-- |  definy, ナルミンチョの創作記録で扱うファイルの種類
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

toMimeType :: Maybe.Maybe FileType -> Maybe.Maybe NonEmptyString.NonEmptyString
toMimeType = case _ of
  Maybe.Just Png ->
    Maybe.Just
      ( NonEmptyString.nes
          (Proxy.Proxy :: Proxy.Proxy "image/png")
      )
  Maybe.Just TypeScript -> Maybe.Nothing
  Maybe.Just PureScript -> Maybe.Nothing
  Maybe.Just JavaScript ->
    Maybe.Just
      ( NonEmptyString.nes
          (Proxy.Proxy :: Proxy.Proxy "text/javascript")
      )
  Maybe.Just Html -> Maybe.Just textHtmlMimeType
  Maybe.Just Json ->
    Maybe.Just
      ( NonEmptyString.nes
          (Proxy.Proxy :: Proxy.Proxy "application/json")
      )
  Maybe.Just FirebaseSecurityRules -> Maybe.Nothing
  Maybe.Nothing ->
    Maybe.Just
      ( NonEmptyString.nes
          (Proxy.Proxy :: Proxy.Proxy "application/octet-stream")
      )

textHtmlMimeType :: NonEmptyString.NonEmptyString
textHtmlMimeType =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "text/html")
