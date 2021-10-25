module Hash (stringToSha256HashValue, bufferAndMimeTypeToSha256HashValue) where

import Node.Buffer as Buffer
import Data.String.NonEmpty as NonEmptyString

foreign import stringToSha256HashValue :: String -> NonEmptyString.NonEmptyString

foreign import bufferAndMimeTypeToSha256HashValue :: { buffer :: Buffer.Buffer, mimeType :: String } -> NonEmptyString.NonEmptyString
