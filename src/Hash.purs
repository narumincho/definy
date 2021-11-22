module Hash
  ( Sha256HashValue
  , toNonEmptyString
  , stringToSha256HashValue
  , bufferAndMimeTypeToSha256HashValue
  ) where

import Data.String.NonEmpty (NonEmptyString)
import Node.Buffer as Buffer
import Prelude as Prelude

newtype Sha256HashValue
  = Sha256HashValue NonEmptyString

derive instance sha256HashValueEq :: Prelude.Eq Sha256HashValue

derive instance sha256HashValueOrd :: Prelude.Ord Sha256HashValue

toNonEmptyString :: Sha256HashValue -> NonEmptyString
toNonEmptyString (Sha256HashValue value) = value

stringToSha256HashValue :: String -> Sha256HashValue
stringToSha256HashValue str = Sha256HashValue (stringToSha256HashValueRaw str)

bufferAndMimeTypeToSha256HashValue :: { buffer :: Buffer.Buffer, mimeType :: String } -> Sha256HashValue
bufferAndMimeTypeToSha256HashValue option = Sha256HashValue (bufferAndMimeTypeToSha256HashValueRaw option)

foreign import stringToSha256HashValueRaw :: String -> NonEmptyString

foreign import bufferAndMimeTypeToSha256HashValueRaw :: { buffer :: Buffer.Buffer, mimeType :: String } -> NonEmptyString
