module PureScript.Wellknown (primModuleName, primString) where

import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import PureScript.Data as Data

primModuleName :: Data.ModuleName
primModuleName =
  Data.ModuleName
    ( NonEmptyArray.singleton
        (NonEmptyString.cons (String.codePointFromChar 'P') "rim")
    )

primString :: Data.PType
primString = Data.PType { moduleName: primModuleName, name: "String", argument: Maybe.Nothing }
