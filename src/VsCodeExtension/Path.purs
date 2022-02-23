module VsCodeExtension.Path
  ( languageServerFileName
  , languageServerFileNameWithExtension
  ) where

import Prelude
import Data.String.NonEmpty as NonEmptyString
import FileSystem.Name as Name
import FileSystem.FileType as FileType
import Type.Proxy (Proxy(..))

languageServerFileName :: Name.Name
languageServerFileName = Name.fromSymbolProxy (Proxy :: _ "language-server")

languageServerFileNameWithExtension :: String
languageServerFileNameWithExtension =
  NonEmptyString.toString
    ( append
        (Name.toNonEmptyString languageServerFileName)
        (FileType.toExtension FileType.JavaScript)
    )
