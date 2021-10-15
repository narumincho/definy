module PureScript.Wellknown (primString, dataMapEmpty) where

import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import PureScript.Data as Data
import Type.Proxy as Proxy

-- | https://pursuit.purescript.org/builtins/docs/Prim
primModuleName :: Data.ModuleName
primModuleName =
  Data.ModuleName
    ( NonEmptyArray.singleton
        (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Prim"))
    )

-- | https://pursuit.purescript.org/builtins/docs/Prim#t:String
primString :: Data.PType
primString = Data.PType { moduleName: primModuleName, name: "String", argument: Maybe.Nothing }

-- | https://pursuit.purescript.org/packages/purescript-ordered-collections/2.0.2/docs/Data.Map
dataMapModuleName :: Data.ModuleName
dataMapModuleName =
  Data.ModuleName
    ( NonEmptyArray.cons (NonEmptyString.cons (String.codePointFromChar 'D') "ata")
        ( NonEmptyArray.singleton
            (NonEmptyString.cons (String.codePointFromChar 'M') "ap")
        )
    )

-- | https://pursuit.purescript.org/packages/purescript-ordered-collections/2.0.2/docs/Data.Map#v:empty
dataMapEmpty :: Data.Expr
dataMapEmpty =
  Data.Variable
    { moduleName: dataMapModuleName
    , name:
        NonEmptyString.cons
          (String.codePointFromChar 'e')
          "mpty"
    }
