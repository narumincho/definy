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
import VsCodeExtension.EvaluatedItem as EvaluatedItem

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
  EvaluatedItem.Module (EvaluatedItem.PartialModule { partList }) ->
    Data.Module
      { definitionList: Prelude.map (partialPartToDefinition moduleName) partList
      , name: moduleName
      }
  _ ->
    Data.Module
      { definitionList: []
      , name: moduleName
      }

partialPartToDefinition :: Data.ModuleName -> EvaluatedItem.PartialPart -> Data.Definition
partialPartToDefinition moduleName (EvaluatedItem.PartialPart rec) =
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

partialExprMaybeToExpr :: Data.ModuleName -> Maybe EvaluatedItem.PartialExpr -> Data.ExprData
partialExprMaybeToExpr moduleName = case _ of
  Just expr -> partialExprToExpr moduleName expr
  Nothing -> Data.StringLiteral "no expr"

partialExprToExpr :: Data.ModuleName -> EvaluatedItem.PartialExpr -> Data.ExprData
partialExprToExpr moduleName = case _ of
  EvaluatedItem.ExprAdd {} -> Data.StringLiteral "unsupported add"
  EvaluatedItem.ExprPartReference { name } ->
    Data.Variable
      { moduleName
      , name: Identifier.identifierToNonEmptyString name
      }
  EvaluatedItem.ExprPartReferenceInvalidName {} -> Data.StringLiteral "invalid name"
  EvaluatedItem.ExprUIntLiteral _ -> Data.StringLiteral "unsupported uint"
  EvaluatedItem.ExprFloat64Literal _ -> Data.StringLiteral "unsupported float"
  EvaluatedItem.ExprTextLiteral value -> Data.StringLiteral value
  EvaluatedItem.ExprNonEmptyTextLiteral (Just value) ->
    Wellknown.exprToExprData
      (Wellknown.nonEmptyStringLiteral value)
  EvaluatedItem.ExprNonEmptyTextLiteral Nothing -> Data.StringLiteral "invalid nonEmptyString"

partialExprToType :: EvaluatedItem.PartialExpr -> Data.TypeData
partialExprToType = case _ of
  EvaluatedItem.ExprAdd {} -> Wellknown.pTypeToTypeData Wellknown.primString
  EvaluatedItem.ExprPartReference {} -> Wellknown.pTypeToTypeData Wellknown.primString
  EvaluatedItem.ExprPartReferenceInvalidName {} -> Wellknown.pTypeToTypeData Wellknown.primString
  EvaluatedItem.ExprUIntLiteral _ -> Wellknown.pTypeToTypeData Wellknown.primString
  EvaluatedItem.ExprFloat64Literal _ -> Wellknown.pTypeToTypeData Wellknown.primString
  EvaluatedItem.ExprTextLiteral _ -> Wellknown.pTypeToTypeData Wellknown.primString
  EvaluatedItem.ExprNonEmptyTextLiteral (Just _) -> Wellknown.pTypeToTypeData Wellknown.nonEmptyString
  EvaluatedItem.ExprNonEmptyTextLiteral Nothing -> Wellknown.pTypeToTypeData Wellknown.primString
