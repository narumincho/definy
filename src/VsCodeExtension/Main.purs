module VsCodeExtension.Main
  ( ActivateType
  , DeactivateType
  , activate
  , deactivate
  ) where

foreign import data ActivateType :: Type

foreign import data DeactivateType :: Type

foreign import activateFunc :: ActivateType

foreign import deactivateFunc :: DeactivateType

activate :: ActivateType
activate = activateFunc

deactivate :: DeactivateType
deactivate = deactivateFunc
