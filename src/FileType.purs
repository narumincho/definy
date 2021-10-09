module FileType (FileType(..), toMimeType) where

import Data.Maybe as Maybe
import Data.Show.Generic as ShowGeneric
import Prelude as Prelude
import Data.Generic.Rep as GenericRep

-- |  definy, ナルミンチョの創作記録で扱うファイルの種類
data FileType
  = Png
  | TypeScript
  | JavaScript
  | Html
  | Json

derive instance eqFileType :: Prelude.Eq FileType

derive instance genericFileType :: GenericRep.Generic FileType _

instance showFileType :: Prelude.Show FileType where
  show = ShowGeneric.genericShow

toMimeType :: Maybe.Maybe FileType -> String
toMimeType = case _ of
  Maybe.Just Png -> "image/png"
  Maybe.Just TypeScript -> "text/typescript"
  Maybe.Just JavaScript -> "text/javascript"
  Maybe.Just Html -> "text/html"
  Maybe.Just Json -> "application/json"
  Maybe.Nothing -> "application/octet-stream"
