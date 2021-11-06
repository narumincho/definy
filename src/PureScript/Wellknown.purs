module PureScript.Wellknown
  ( primString
  , dataMapEmpty
  , stringLiteral
  , nonEmptyStringLiteral
  , stringSingleton
  , nonEmptyString
  , arrayLiteral
  , call
  , variable
  , definition
  , pTypeWithArgument
  , pTypeFrom
  , PType
  , Expr
  ) where

import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude
import PureScript.Data as Data
import Type.Proxy as Proxy

data PType :: Type -> Type
-- | PureScript の型. 型を間違えないように, 型を幽霊型としてつけている
data PType pType
  = PType Data.TypeData

data Expr :: Type -> Type
-- | PureScript の式. 型を間違えないように, 型を幽霊型としてつけている
data Expr pType
  = Expr Data.ExprData

-- | Prim
-- | https://pursuit.purescript.org/builtins/docs/Prim
primModuleName :: Data.ModuleName
primModuleName =
  Data.ModuleName
    ( NonEmptyArray.singleton
        (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Prim"))
    )

-- | https://pursuit.purescript.org/builtins/docs/Prim#t:String
primString :: PType String
primString =
  PType
    ( Data.TypeData
        { moduleName: primModuleName
        , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "String")
        }
    )

-- | Data.Map
-- | https://pursuit.purescript.org/packages/purescript-ordered-collections/2.0.2/docs/Data.Map
dataMapModuleName :: Data.ModuleName
dataMapModuleName =
  Data.ModuleName
    ( NonEmptyArray.cons' (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Data"))
        [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Map") ]
    )

-- | https://pursuit.purescript.org/packages/purescript-ordered-collections/2.0.2/docs/Data.Map#v:empty
dataMapEmpty :: forall k v. Expr (Map.Map k v)
dataMapEmpty =
  Expr
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
stringSingleton :: Expr String.CodePoint -> Expr String
stringSingleton (Expr codePoint) =
  Expr
    ( Data.Call
        { function:
            Data.Variable
              { moduleName: dataStringModuleName
              , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "singleton")
              }
        , argument: codePoint
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
    , argument: proxy
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
        Data.TypeWithArgument
          { function:
              Data.TypeData
                { moduleName: typeProxyModuleName
                , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Proxy")
                }
          , argument: Data.SymbolLiteral str
          }
    }

-- | ```purs
-- | "{str}"
-- | ```
stringLiteral :: String -> Expr String
stringLiteral str = Expr (Data.StringLiteral str)

-- | ```purs
-- | NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "{str}")
-- | ```
nonEmptyStringLiteral :: NonEmptyString.NonEmptyString -> Expr NonEmptyString.NonEmptyString
nonEmptyStringLiteral str =
  Expr
    ( nonEmptyStringNes
        ( proxyProxyWithTypeAnotation
            (NonEmptyString.toString str)
        )
    )

nonEmptyString :: PType NonEmptyString.NonEmptyString
nonEmptyString =
  PType
    ( Data.TypeData
        { moduleName: dataStringNonEmptyModuleName
        , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "NonEmptyString")
        }
    )

arrayLiteral :: forall t. Array (Expr t) -> Expr (Array t)
arrayLiteral list =
  Expr
    ( Data.ArrayLiteral
        (Prelude.map (\(Expr exprData) -> exprData) list)
    )

call :: forall input output. Expr (input -> output) -> Expr input -> Expr output
call (Expr function) (Expr argument) =
  Expr
    ( Data.Call
        { function, argument }
    )

variable :: forall t. { moduleName :: Data.ModuleName, name :: NonEmptyString.NonEmptyString } -> Expr t
variable option = Expr (Data.Variable option)

definition ::
  forall t.
  { name :: NonEmptyString.NonEmptyString
  , document :: String
  , pType :: PType t
  , expr :: Expr t
  , isExport :: Boolean
  } ->
  Data.Definition
definition option =
  let
    (Expr exprData) = option.expr

    (PType typeData) = option.pType
  in
    Data.Definition
      { name: option.name
      , document: option.document
      , typeData: typeData
      , exprData: exprData
      , isExport: option.isExport
      }

pTypeFrom ::
  forall t.
  { moduleName :: Data.ModuleName
  , name :: NonEmptyString.NonEmptyString
  } ->
  PType t
pTypeFrom option =
  PType
    (Data.TypeData option)

pTypeWithArgument :: forall input output. PType (input -> output) -> PType input -> PType output
pTypeWithArgument (PType function) (PType argument) =
  PType
    (Data.TypeWithArgument { function, argument })
