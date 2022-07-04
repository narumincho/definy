module VsCodeExtension.CodeGenPureScript
  ( definyEvaluatedTreeToPureScriptCodeAsBinary
  ) where

import Binary as Binary
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Definy.Identifier as Identifier
import Prelude as Prelude
import PureScript.Data as Data
import PureScript.ToString as ToString
import PureScript.Wellknown as Wellknown
import Type.Proxy (Proxy(..))
import Util as Util
import VsCodeExtension.Evaluate as Evaluate

definyEvaluatedTreeToPureScriptCodeAsBinary :: Evaluate.EvaluatedTree -> String -> Binary.Binary
definyEvaluatedTreeToPureScriptCodeAsBinary definyCode fileName =
  Binary.fromStringWriteAsUtf8
    ( ToString.toString
        (definyEvaluatedTreeToPureScriptCode definyCode (fileNameToModuleName fileName))
    )

fileNameToModuleName :: String -> Data.ModuleName
fileNameToModuleName fileName =
  let
    filePathArray =
      Array.mapMaybe (NonEmptyString.fromString)
        ( Prelude.map
            Util.firstUppercase
            (String.split (String.Pattern "/") fileName)
        )
  in
    case NonEmptyArray.fromArray filePathArray of
      Just fileNameNonEmpty -> Data.ModuleName fileNameNonEmpty
      Nothing ->
        Data.ModuleName
          ( NonEmptyArray.singleton
              (NonEmptyString.nes (Proxy :: Proxy "FileNameIsEmpty"))
          )

definyEvaluatedTreeToPureScriptCode :: Evaluate.EvaluatedTree -> Data.ModuleName -> Data.Module
definyEvaluatedTreeToPureScriptCode (Evaluate.EvaluatedTree { item }) moduleName = case item of
  Evaluate.Module (Evaluate.PartialModule { partList }) ->
    Data.Module
      { definitionList: Prelude.map (partialPartToDefinition moduleName) partList
      , name: moduleName
      }
  _ ->
    Data.Module
      { definitionList: []
      , name: moduleName
      }

partialPartToDefinition :: Data.ModuleName -> Evaluate.PartialPart -> Data.Definition
partialPartToDefinition moduleName (Evaluate.PartialPart rec) =
  Data.Definition
    { document: rec.description
    , exprData: partialExprMaybeToExpr moduleName rec.expr
    , isExport: true
    , name:
        case rec.name of
          Just name -> Identifier.identifierToNonEmptyString name
          Nothing -> NonEmptyString.nes (Proxy :: Proxy "invalidName")
    , typeData:
        ( case rec.expr of
            Just expr -> partialExprToType expr
            Nothing -> Wellknown.pTypeToTypeData Wellknown.primString
        )
    }

partialExprMaybeToExpr :: Data.ModuleName -> Maybe Evaluate.PartialExpr -> Data.ExprData
partialExprMaybeToExpr moduleName = case _ of
  Just expr -> partialExprToExpr moduleName expr
  Nothing -> Data.StringLiteral "no expr"

partialExprToExpr :: Data.ModuleName -> Evaluate.PartialExpr -> Data.ExprData
partialExprToExpr moduleName = case _ of
  Evaluate.ExprAdd {} -> Data.StringLiteral "unsupported add"
  Evaluate.ExprPartReference { name } ->
    Data.Variable
      { moduleName
      , name: Identifier.identifierToNonEmptyString name
      }
  Evaluate.ExprPartReferenceInvalidName {} -> Data.StringLiteral "invalid name"
  Evaluate.ExprUIntLiteral _ -> Data.StringLiteral "unsupported uint"
  Evaluate.ExprFloat64Literal _ -> Data.StringLiteral "unsupported float"
  Evaluate.ExprTextLiteral value -> Data.StringLiteral value
  Evaluate.ExprNonEmptyTextLiteral (Just value) ->
    Wellknown.exprToExprData
      (Wellknown.nonEmptyStringLiteral value)
  Evaluate.ExprNonEmptyTextLiteral Nothing -> Data.StringLiteral "invalid nonEmptyString"

partialExprToType :: Evaluate.PartialExpr -> Data.TypeData
partialExprToType = case _ of
  Evaluate.ExprAdd {} -> Wellknown.pTypeToTypeData Wellknown.primString
  Evaluate.ExprPartReference {} -> Wellknown.pTypeToTypeData Wellknown.primString
  Evaluate.ExprPartReferenceInvalidName {} -> Wellknown.pTypeToTypeData Wellknown.primString
  Evaluate.ExprUIntLiteral _ -> Wellknown.pTypeToTypeData Wellknown.primString
  Evaluate.ExprFloat64Literal _ -> Wellknown.pTypeToTypeData Wellknown.primString
  Evaluate.ExprTextLiteral _ -> Wellknown.pTypeToTypeData Wellknown.primString
  Evaluate.ExprNonEmptyTextLiteral (Just _) -> Wellknown.pTypeToTypeData Wellknown.nonEmptyString
  Evaluate.ExprNonEmptyTextLiteral Nothing -> Wellknown.pTypeToTypeData Wellknown.primString
