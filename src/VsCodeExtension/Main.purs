module VsCodeExtension.Main
  ( ActivateType
  , DeactivateType
  , activate
  , deactivate
  ) where

import VsCodeExtension.Path as Path

foreign import data ActivateType :: Type

foreign import data DeactivateType :: Type

foreign import activateFunc :: String -> ActivateType

foreign import deactivateFunc :: DeactivateType

activate :: ActivateType
activate = activateFunc Path.languageServerFileNameWithExtension

deactivate :: DeactivateType
deactivate = deactivateFunc
