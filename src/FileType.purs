module FileType (FileType(..), toMimeType) where

import Data.Maybe as Maybe

-- |  definy, ナルミンチョの創作記録で扱うファイルの種類
data FileType
  = Png
  | TypeScript
  | JavaScript
  | Html

toMimeType :: Maybe.Maybe FileType -> String
toMimeType = case _ of
  Maybe.Just Png -> "image/png"
  Maybe.Just TypeScript -> "text/typescript"
  Maybe.Just JavaScript -> "text/javascript"
  Maybe.Just Html -> "text/html"
  Maybe.Nothing -> "application/octet-stream"
