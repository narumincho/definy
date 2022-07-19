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
  EvaluatedItem.Module (partialModule@(EvaluatedItem.PartialModule { partOrTypePartList })) ->
    Data.Module
      { definitionList: Prelude.map (partialPartToDefinition partialModule moduleName) partOrTypePartList
      , name: moduleName
      }
  _ ->
    Data.Module
      { definitionList: []
      , name: moduleName
      }

partialPartToDefinition ::
  EvaluatedItem.PartialModule ->
  Data.ModuleName -> EvaluatedItem.PartialPartOrTypePart -> Data.Definition
partialPartToDefinition partialModule moduleName = case _ of
  EvaluatedItem.PartialPartOrTypePartPart (EvaluatedItem.PartialPart rec) ->
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
  EvaluatedItem.PartialPartOrTypePartTypePart (EvaluatedItem.PartialType rec) ->
    Data.DataDefinition
      { document: rec.description
      , name:
          case rec.name of
            Just name -> Identifier.identifierToNonEmptyString name
            Nothing -> NonEmptyString.nes (Proxy :: Proxy "invalidName")
      , patternList:
          (exprToPatternList partialModule rec.expr)
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
  EvaluatedItem.ExprTypeBodySum _ -> Data.StringLiteral "unsupported ExprTypeBodySum"
  EvaluatedItem.ExprPattern _ -> Data.StringLiteral "unsupported ExprPattern"

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
  EvaluatedItem.ExprTypeBodySum _ -> Wellknown.pTypeToTypeData Wellknown.primString
  EvaluatedItem.ExprPattern _ -> Wellknown.pTypeToTypeData Wellknown.primString

exprToPatternList ::
  EvaluatedItem.PartialModule ->
  Maybe EvaluatedItem.PartialExpr ->
  Array Data.Pattern
exprToPatternList partialModule = case _ of
  Just expr ->
    let
      (Evaluate.EvaluateExprResult { value }) = Evaluate.evaluateExpr expr partialModule
    in
      case value of
        Evaluate.ValueList patternList ->
          Array.mapMaybe
            ( case _ of
                Evaluate.ValuePattern (Evaluate.Pattern pattern) ->
                  Just
                    ( Data.Pattern
                        { name: (Identifier.identifierToNonEmptyString pattern.name)
                        , parameter: Nothing
                        }
                    )
                _ -> Nothing
            )
            patternList
        _ -> []
  Nothing -> []
