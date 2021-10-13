module PureScript.ToString where

import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe as Maybe
import Data.Set as Set
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude
import PureScript.Data as Data

toString :: Data.Module -> String
toString module_@(Data.Module { name, definitionList }) =
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

moduleNameCode :: Data.Module -> String
moduleNameCode (Data.Module { name, definitionList }) = String.joinWith "" ([ "module ", moduleNameToString name, "(", String.joinWith ", " (collectExportDefinition definitionList), ") where" ])

moduleNameToString :: Data.ModuleName -> String
moduleNameToString (Data.ModuleName stringList) =
  String.joinWith "."
    (Prelude.map NonEmptyString.toString (NonEmptyArray.toArray stringList))

moduleNameToQualifiedName :: Data.ModuleName -> String
moduleNameToQualifiedName (Data.ModuleName stringList) =
  String.joinWith "_"
    (Prelude.map NonEmptyString.toString (NonEmptyArray.toArray stringList))

collectInportModule :: Data.Module -> Set.Set Data.ModuleName
collectInportModule (Data.Module { name, definitionList }) =
  Set.delete name
    ( Set.unions
        (Prelude.map collectInportModuleInDefinition definitionList)
    )

collectInportModuleInDefinition :: Data.Definition -> Set.Set Data.ModuleName
collectInportModuleInDefinition (Data.Definition { pType, expr }) =
  Set.union
    (collectInportModuleInType pType)
    (collectInportModuleInExpr expr)

collectInportModuleInType :: Data.PType -> Set.Set Data.ModuleName
collectInportModuleInType (Data.PType { moduleName, argument }) =
  Set.insert
    moduleName
    ( case argument of
        Maybe.Just argumentType -> collectInportModuleInType argumentType
        Maybe.Nothing -> Set.empty
    )

collectInportModuleInExpr :: Data.Expr -> Set.Set Data.ModuleName
collectInportModuleInExpr = case _ of
  Data.Call { function, arguments } ->
    Set.unions
      ( Prelude.map collectInportModuleInExpr
          (Array.cons function (NonEmptyArray.toArray arguments))
      )
  Data.Variable { moduleName } -> Set.singleton moduleName
  Data.StringLiteral _ -> Set.empty
  Data.ArrayLiteral list -> Set.unions (Prelude.map collectInportModuleInExpr list)

collectExportDefinition :: Array Data.Definition -> Array String
collectExportDefinition list =
  Array.mapMaybe
    ( case _ of
        Data.Definition { isExport: true, name } -> Maybe.Just (NonEmptyString.toString name)
        Data.Definition _ -> Maybe.Nothing
    )
    list

definitionToString :: Data.ModuleName -> Data.Definition -> String
definitionToString selfModuleName (Data.Definition { name, document, pType, expr }) =
  String.joinWith ""
    [ documentToString document
    , NonEmptyString.toString name
    , " :: "
    , typeToString selfModuleName pType
    , "\n"
    , NonEmptyString.toString name
    , " = "
    , exprToString selfModuleName expr
    ]

typeToString :: Data.ModuleName -> Data.PType -> String
typeToString selfModuleName (Data.PType { moduleName, name, argument }) =
  String.joinWith ""
    ( Array.concat
        [ [ moduleNameToStringSelfEmpty selfModuleName moduleName, name ]
        , case argument of
            Maybe.Just argumentType -> [ "(", typeToString selfModuleName argumentType, ")" ]
            Maybe.Nothing -> []
        ]
    )

exprToString :: Data.ModuleName -> Data.Expr -> String
exprToString selfModuleName = case _ of
  Data.Call { function, arguments } ->
    String.joinWith " "
      ( Prelude.map
          (\expr -> String.joinWith "" [ "(", exprToString selfModuleName expr, ")" ])
          (Array.cons function (NonEmptyArray.toArray arguments))
      )
  Data.Variable { moduleName, name } ->
    String.joinWith ""
      [ moduleNameToStringSelfEmpty selfModuleName moduleName, NonEmptyString.toString name ]
  Data.StringLiteral value ->
    String.joinWith ""
      [ "\""
      , String.replaceAll (String.Pattern "\n") (String.Replacement "\\n")
          ( String.replaceAll (String.Pattern "\"") (String.Replacement "\\\"")
              ( String.replaceAll (String.Pattern "\\") (String.Replacement "\\\\") value
              )
          )
      , "\""
      ]
  Data.ArrayLiteral list ->
    String.joinWith ""
      [ "[ "
      , String.joinWith ", " (Prelude.map (exprToString selfModuleName) list)
      , " ]"
      ]

moduleNameToStringSelfEmpty :: Data.ModuleName -> Data.ModuleName -> String
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
