module PureScript
  ( Module(..)
  , Definition(..)
  , PType(..)
  , toString
  , Expr(..)
  , ModuleName(..)
  , moduleNameAsString
  , primModuleName
  ) where

import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe as Maybe
import Data.Set as Set
import Data.String as String
import Prelude as Prelude

newtype Module
  = Module
  { name :: ModuleName
  , definitionList :: Array Definition
  }

newtype Definition
  = Definition
  { name :: String
  , document :: String
  , pType :: PType
  , expr :: Expr
  , isExport :: Boolean
  }

newtype ModuleName
  = ModuleName (NonEmptyArray.NonEmptyArray String)

derive instance moduleNameEq :: Prelude.Eq ModuleName

derive instance moduleNameOrd :: Prelude.Ord ModuleName

newtype PType
  = PType { moduleName :: ModuleName, name :: String, argument :: Maybe.Maybe PType }

data Expr
  = Expr { moduleName :: ModuleName, name :: String, argument :: Maybe.Maybe Expr }
  | StringLiteral String

moduleNameAsString :: Module -> NonEmptyArray.NonEmptyArray String
moduleNameAsString (Module { name: ModuleName name }) = name

toString :: Module -> String
toString module_@(Module { name, definitionList }) =
  String.joinWith "\n\n"
    ( Array.concat
        [ [ "-- generated by definy. Do not edit!"
          , moduleNameCode module_
          , String.joinWith "\n"
              ( Prelude.map
                  ( \moduleName ->
                      String.joinWith
                        ""
                        [ "import "
                        , moduleNameToString moduleName
                        , " as "
                        , moduleNameToQualifiedName moduleName
                        ]
                  )
                  ( Set.toUnfoldable
                      (collectInportModule module_)
                  )
              )
          ]
        , Prelude.map (definitionToString name) definitionList
        , [ "" ]
        ]
    )

moduleNameCode :: Module -> String
moduleNameCode (Module { name, definitionList }) = String.joinWith "" ([ "module ", moduleNameToString name, "(", String.joinWith ", " (collectExportDefinition definitionList), ") where" ])

moduleNameToString :: ModuleName -> String
moduleNameToString (ModuleName stringList) = String.joinWith "." (NonEmptyArray.toArray stringList)

moduleNameToQualifiedName :: ModuleName -> String
moduleNameToQualifiedName (ModuleName stringList) = String.joinWith "_" (NonEmptyArray.toArray stringList)

collectInportModule :: Module -> Set.Set ModuleName
collectInportModule (Module { name, definitionList }) =
  Set.delete name
    ( Set.unions
        (Prelude.map collectInportModuleInDefinition definitionList)
    )

collectInportModuleInDefinition :: Definition -> Set.Set ModuleName
collectInportModuleInDefinition (Definition { pType, expr }) =
  Set.union
    (collectInportModuleInType pType)
    (collectInportModuleInExpr expr)

collectInportModuleInType :: PType -> Set.Set ModuleName
collectInportModuleInType (PType { moduleName, argument }) =
  Set.insert
    moduleName
    ( case argument of
        Maybe.Just argumentType -> collectInportModuleInType argumentType
        Maybe.Nothing -> Set.empty
    )

collectInportModuleInExpr :: Expr -> Set.Set ModuleName
collectInportModuleInExpr = case _ of
  (Expr { moduleName, argument }) ->
    Set.insert
      moduleName
      ( case argument of
          Maybe.Just argumentExpr -> collectInportModuleInExpr argumentExpr
          Maybe.Nothing -> Set.empty
      )
  (StringLiteral _) -> Set.empty

collectExportDefinition :: Array Definition -> Array String
collectExportDefinition list =
  Array.mapMaybe
    ( case _ of
        Definition { isExport: true, name } -> Maybe.Just name
        Definition _ -> Maybe.Nothing
    )
    list

definitionToString :: ModuleName -> Definition -> String
definitionToString selfModuleName (Definition { name, document, pType, expr }) =
  String.joinWith ""
    [ documentToString document
    , name
    , " :: "
    , typeToString selfModuleName pType
    , "\n"
    , name
    , " = "
    , exprToString selfModuleName expr
    ]

typeToString :: ModuleName -> PType -> String
typeToString selfModuleName (PType { moduleName, name, argument }) =
  String.joinWith ""
    ( Array.concat
        [ [ moduleNameToStringSelfEmpty selfModuleName moduleName, name ]
        , case argument of
            Maybe.Just argumentType -> [ "(", typeToString selfModuleName argumentType, ")" ]
            Maybe.Nothing -> []
        ]
    )

exprToString :: ModuleName -> Expr -> String
exprToString selfModuleName = case _ of
  Expr { moduleName, name, argument } ->
    String.joinWith ""
      ( Array.concat
          [ [ moduleNameToStringSelfEmpty selfModuleName moduleName, name ]
          , case argument of
              Maybe.Just argumentExpr -> [ "(", exprToString selfModuleName argumentExpr, ")" ]
              Maybe.Nothing -> []
          ]
      )
  StringLiteral value ->
    String.joinWith ""
      [ "\""
      , String.replaceAll (String.Pattern "\n") (String.Replacement "\\n")
          ( String.replaceAll (String.Pattern "\"") (String.Replacement "\\\"")
              ( String.replaceAll (String.Pattern "\\") (String.Replacement "\\\\") value
              )
          )
      , "\""
      ]

moduleNameToStringSelfEmpty :: ModuleName -> ModuleName -> String
moduleNameToStringSelfEmpty selfModuleName moduleName =
  if Prelude.eq moduleName selfModuleName then
    ""
  else
    Prelude.append (moduleNameToQualifiedName moduleName) "."

documentToString :: String -> String
documentToString document =
  let
    documentTrimmed = String.trim document
  in
    if String.null documentTrimmed then
      ""
    else
      Prelude.append
        ( String.joinWith "\n"
            ( Prelude.map
                ( \line ->
                    Prelude.append "-- |"
                      ( if String.null line then
                          ""
                        else
                          (Prelude.append " " line)
                      )
                )
                (String.split (String.Pattern "\n") documentTrimmed)
            )
        )
        "\n"

primModuleName :: ModuleName
primModuleName = ModuleName (NonEmptyArray.singleton "Prim")
