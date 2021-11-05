module PureScript.Wellknown
  ( primString
  , dataMapEmpty
  , nonEmptyStringLiteral
  , stringSingleton
  , nonEmptyString
  , arrayLiteral
  , call
  , variable
  , definition
  ) where

import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude
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
dataMapEmpty :: forall k v. Data.Expr (Map.Map k v)
dataMapEmpty =
  Data.Expr
    ( Data.Variable
        { moduleName: dataMapModuleName
        , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "empty")
        }
    )

-- | Data.String.NonEmpty
-- | https://pursuit.purescript.org/packages/purescript-strings/5.0.0/docs/Data.String.NonEmpty
dataStringNonEmptyModuleName :: Data.ModuleName
dataStringNonEmptyModuleName =
  Data.ModuleName
    ( NonEmptyArray.cons' (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Data"))
        [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "String")
        , NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "NonEmpty")
        ]
    )

dataStringModuleName :: Data.ModuleName
dataStringModuleName =
  Data.ModuleName
    ( NonEmptyArray.cons' (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Data"))
        [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "String") ]
    )

-- | https://pursuit.purescript.org/packages/purescript-strings/5.0.0/docs/Data.String#v:singleton
stringSingleton :: Data.Expr String.CodePoint -> Data.Expr String
stringSingleton (Data.Expr codePoint) =
  Data.Expr
    ( Data.Call
        { function:
            Data.Variable
              { moduleName: dataStringModuleName
              , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "singleton")
              }
        , arguments: NonEmptyArray.singleton codePoint
        }
    )

-- | https://pursuit.purescript.org/packages/purescript-strings/5.0.0/docs/Data.String.NonEmpty.Internal#v:nes
nonEmptyStringNes :: Data.ExprData -> Data.ExprData
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
typeProxyModuleName :: Data.ModuleName
typeProxyModuleName =
  Data.ModuleName
    ( NonEmptyArray.cons' (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Type"))
        [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Proxy") ]
    )

-- | Proxy.Proxy :: Proxy.Proxy "{str}"
proxyProxyWithTypeAnotation :: String -> Data.ExprData
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
nonEmptyStringLiteral :: NonEmptyString.NonEmptyString -> Data.Expr NonEmptyString.NonEmptyString
nonEmptyStringLiteral str =
  Data.Expr
    ( nonEmptyStringNes
        ( proxyProxyWithTypeAnotation
            (NonEmptyString.toString str)
        )
    )

nonEmptyString :: Data.PType
nonEmptyString =
  Data.PType
    { moduleName: dataStringNonEmptyModuleName
    , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "NonEmptyString")
    , argument: Maybe.Nothing
    }

arrayLiteral :: forall t. Array (Data.Expr t) -> Data.Expr (Array t)
arrayLiteral list =
  Data.Expr
    ( Data.ArrayLiteral
        (Prelude.map (\(Data.Expr exprData) -> exprData) list)
    )

call :: forall input output. Data.Expr (input -> output) -> Data.Expr input -> Data.Expr output
call (Data.Expr function) (Data.Expr argument) =
  Data.Expr
    ( Data.Call
        { function, arguments: NonEmptyArray.singleton argument }
    )

variable :: forall t. { moduleName :: Data.ModuleName, name :: NonEmptyString.NonEmptyString } -> Data.Expr t
variable option = Data.Expr (Data.Variable option)

definition ::
  forall t.
  { name :: NonEmptyString.NonEmptyString
  , document :: String
  , pType :: Data.PType
  , expr :: Data.Expr t
  , isExport :: Boolean
  } ->
  Data.Definition
definition option =
  let
    (Data.Expr exprData) = option.expr
  in
    Data.Definition
      { name: option.name
      , document: option.document
      , pType: option.pType
      , expr: exprData
      , isExport: option.isExport
      }
