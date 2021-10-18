module PureScript.Wellknown
  ( primString
  , dataMapEmpty
  , nonEmptyStringLiteral
  , stringSingleton
  , nonEmptyString
  ) where

import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import PureScript.Data (ModuleName)
import PureScript.Data as Data
import Type.Proxy as Proxy

-- | Prim
-- | https://pursuit.purescript.org/builtins/docs/Prim
primModuleName :: Data.ModuleName
primModuleName =
  Data.ModuleName
    ( NonEmptyArray.singleton
        (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Prim"))
    )

-- | https://pursuit.purescript.org/builtins/docs/Prim#t:String
primString :: Data.PType
primString =
  Data.PType
    { moduleName: primModuleName
    , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "String")
    , argument: Maybe.Nothing
    }

-- | Data.Map
-- | https://pursuit.purescript.org/packages/purescript-ordered-collections/2.0.2/docs/Data.Map
dataMapModuleName :: Data.ModuleName
dataMapModuleName =
  Data.ModuleName
    ( NonEmptyArray.cons' (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Data"))
        [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Map") ]
    )

-- | https://pursuit.purescript.org/packages/purescript-ordered-collections/2.0.2/docs/Data.Map#v:empty
dataMapEmpty :: Data.Expr
dataMapEmpty =
  Data.Variable
    { moduleName: dataMapModuleName
    , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "empty")
    }

-- | Data.String.NonEmpty
-- | https://pursuit.purescript.org/packages/purescript-strings/5.0.0/docs/Data.String.NonEmpty
dataStringNonEmptyModuleName :: ModuleName
dataStringNonEmptyModuleName =
  Data.ModuleName
    ( NonEmptyArray.cons' (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Data"))
        [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "String")
        , NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "NonEmpty")
        ]
    )

dataStringModuleName :: ModuleName
dataStringModuleName =
  Data.ModuleName
    ( NonEmptyArray.cons' (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Data"))
        [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "String") ]
    )

-- | https://pursuit.purescript.org/packages/purescript-strings/5.0.0/docs/Data.String#v:singleton
stringSingleton :: Data.Expr -> Data.Expr
stringSingleton codePoint =
  Data.Call
    { function:
        Data.Variable
          { moduleName: dataStringModuleName
          , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "singleton")
          }
    , arguments: NonEmptyArray.singleton codePoint
    }

-- | https://pursuit.purescript.org/packages/purescript-strings/5.0.0/docs/Data.String.NonEmpty.Internal#v:nes
nonEmptyStringNes :: Data.Expr -> Data.Expr
nonEmptyStringNes proxy =
  Data.Call
    { function:
        Data.Variable
          { moduleName: dataStringNonEmptyModuleName
          , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "nes")
          }
    , arguments: NonEmptyArray.singleton proxy
    }

-- | Type.Proxy
-- | https://pursuit.purescript.org/packages/purescript-prelude/5.0.1/docs/Type.Proxy
typeProxyModuleName :: ModuleName
typeProxyModuleName =
  Data.ModuleName
    ( NonEmptyArray.cons' (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Type"))
        [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Proxy") ]
    )

-- | Proxy.Proxy :: Proxy.Proxy "{str}"
proxyProxyWithTypeAnotation :: String -> Data.Expr
proxyProxyWithTypeAnotation str =
  Data.TypeAnnotation
    { expr: Data.Variable { moduleName: typeProxyModuleName, name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Proxy") }
    , pType:
        Data.PType
          { moduleName: typeProxyModuleName
          , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Proxy")
          , argument: Maybe.Just (Data.SymbolLiteral str)
          }
    }

-- | NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "{str}")
nonEmptyStringLiteral :: NonEmptyString.NonEmptyString -> Data.Expr
nonEmptyStringLiteral str =
  nonEmptyStringNes
    ( proxyProxyWithTypeAnotation
        (NonEmptyString.toString str)
    )

nonEmptyString :: Data.PType
nonEmptyString =
  Data.PType
    { moduleName: dataStringNonEmptyModuleName
    , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "NonEmptyString")
    , argument: Maybe.Nothing
    }
