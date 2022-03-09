module TypeScript.ModuleName (ModuleName(..)) where

import Prelude as Prelude
import Data.String.NonEmpty (NonEmptyString)
import FileSystem.Path as Path

data ModuleName
  = NpmModule NonEmptyString
  | Local Path.FilePath

derive instance eqModuleName :: Prelude.Eq ModuleName

derive instance ordModuleName :: Prelude.Ord ModuleName
