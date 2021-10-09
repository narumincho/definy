module Hash (stringToSha256HashValue, bufferAndMimeTypeToSha256HashValue) where

import Node.Buffer as Buffer

foreign import stringToSha256HashValue :: String -> String

foreign import bufferAndMimeTypeToSha256HashValue :: { buffer :: Buffer.Buffer, mimeType :: String } -> String
