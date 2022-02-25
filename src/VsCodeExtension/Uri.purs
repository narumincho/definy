module VsCodeExtension.Uri
  ( Uri
  , uriToString
  ) where

import Prelude
import Data.Argonaut as Argonaut

newtype Uri
  = Uri String

derive instance eqUri :: Eq Uri

derive instance ordUri :: Ord Uri

instance decodeUri :: Argonaut.DecodeJson Uri where
  decodeJson json = do
    (uri :: String) <- Argonaut.decodeJson json
    pure (Uri uri)

instance encodeUri :: Argonaut.EncodeJson Uri where
  encodeJson uri = Argonaut.fromString (uriToString uri)

uriToString :: Uri -> String
uriToString (Uri str) = str
