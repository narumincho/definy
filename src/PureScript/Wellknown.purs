module PureScript.Wellknown (primModuleName, primString) where

import Data.Array.NonEmpty as NonEmptyArray
import PureScript.Data as Data
import Data.Maybe as Maybe

primModuleName :: Data.ModuleName
primModuleName = Data.ModuleName (NonEmptyArray.singleton "Prim")

primString :: Data.PType
primString = Data.PType { moduleName: primModuleName, name: "String", argument: Maybe.Nothing }
