module VsCodeExtension.CodeGenJsTs
  ( codeAsBinary
  ) where

import Prelude as Prelude
import Binary as Binary
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Definy.Identifier as DefinyIdentifier
import FileSystem.Name as FileSystemName
import FileSystem.Path as FileSystemPath
import Type.Proxy (Proxy(..))
import TypeScript.Data as TsData
import TypeScript.Identifier as TsIdentifier
import TypeScript.ModuleName as TsModuleName
import TypeScript.ToString as TsToString
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedItem as EvaluatedItem

codeAsBinary :: Evaluate.EvaluatedTree -> Boolean -> Binary.Binary
codeAsBinary definyCode outputType = case Map.lookup
    filePath
    ( TsToString.typeScriptModuleMapToString
        (moduleMap definyCode)
        outputType
    ) of
  Just (TsToString.ModuleResult { code }) -> Binary.fromStringWriteAsUtf8 code
  Nothing -> Binary.fromStringWriteAsUtf8 "output error"

filePath :: FileSystemPath.FilePath
filePath =
  FileSystemPath.FilePath
    { directoryPath: FileSystemPath.DirectoryPath []
    , fileName: FileSystemName.fromSymbolProxy (Proxy :: Proxy "main")
    }

moduleMap :: Evaluate.EvaluatedTree -> TsData.TypeScriptModuleMap
moduleMap (Evaluate.EvaluatedTree { item }) =
  TsData.TypeScriptModuleMap
    ( Map.singleton
        (TsModuleName.Local filePath)
        ( case item of
            EvaluatedItem.Module definyModule -> definyPartialModuleToTypeScriptModule definyModule
            _ ->
              ( TsData.Module
                  { exportDefinitionList: []
                  , moduleDocument: "コードの木構造の直下がモジュールでない!"
                  }
              )
        )
    )

definyPartialModuleToTypeScriptModule :: EvaluatedItem.PartialModule -> TsData.Module
definyPartialModuleToTypeScriptModule (EvaluatedItem.PartialModule partialModule) =
  TsData.Module
    { exportDefinitionList:
        Prelude.map
          (definyPartialPartToExportVariable (EvaluatedItem.PartialModule partialModule))
          partialModule.partOrTypePartList
    , moduleDocument: partialModule.description
    }

definyPartialPartToExportVariable :: EvaluatedItem.PartialModule -> EvaluatedItem.PartialPartOrTypePart -> TsData.ExportDefinition
definyPartialPartToExportVariable partialModule = case _ of
  EvaluatedItem.PartialPartOrTypePartTypePart (EvaluatedItem.PartialType typePart) ->
    TsData.ExportDefinitionTypeAlias
      ( definyPartialPartToType
          partialModule
          (EvaluatedItem.PartialType typePart)
      )
  EvaluatedItem.PartialPartOrTypePartPart partialPart -> definyPartialPartToExportMainVariable partialPart

definyPartialPartToExportMainVariable :: EvaluatedItem.PartialPart -> TsData.ExportDefinition
definyPartialPartToExportMainVariable (EvaluatedItem.PartialPart partialPart) =
  TsData.ExportDefinitionVariable
    ( TsData.VariableDeclaration
        { name: identifierMaybeToTsIdentifier partialPart.name
        , document: partialPart.description
        , type:
            case partialPart.expr of
              Nothing -> TsData.TsTypeUnknown
              Just (EvaluatedItem.ExprAdd _) -> TsData.TsTypeNumber
              Just (EvaluatedItem.ExprPartReference _) -> TsData.TsTypeUnknown
              Just (EvaluatedItem.ExprPartReferenceInvalidName _) -> TsData.TsTypeUnknown
              Just (EvaluatedItem.ExprUIntLiteral _) -> TsData.TsTypeNumber
              Just (EvaluatedItem.ExprTextLiteral _) -> TsData.TsTypeString
              Just (EvaluatedItem.ExprNonEmptyTextLiteral _) -> TsData.TsTypeString
              Just (EvaluatedItem.ExprFloat64Literal _) -> TsData.TsTypeNumber
              Just (EvaluatedItem.ExprTypeBodySum _) -> TsData.TsTypeString
              Just (EvaluatedItem.ExprPattern _) -> TsData.TsTypeString
        , expr: definyPartialExprToTypeScriptExpr partialPart.expr
        , export: true
        }
    )

definyPartialPartToType ::
  EvaluatedItem.PartialModule ->
  EvaluatedItem.PartialType ->
  TsData.TypeAlias
definyPartialPartToType partialModule (EvaluatedItem.PartialType partialPart) =
  TsData.TypeAlias
    { name: identifierMaybeToTsIdentifier partialPart.name
    , typeParameterList: []
    , document: partialPart.description
    , type:
        case partialPart.expr of
          Just expr ->
            let
              (Evaluate.EvaluateExprResult { value }) =
                Evaluate.evaluateExpr
                  expr
                  partialModule
            in
              case value of
                Evaluate.ValueList list -> case NonEmptyArray.fromArray
                    ( Array.mapMaybe
                        ( case _ of
                            Evaluate.ValuePattern (Evaluate.Pattern pattern) ->
                              Just
                                ( TsData.TsTypeStringLiteral
                                    (DefinyIdentifier.identifierToString false pattern.name)
                                )
                            _ -> Nothing
                        )
                        list
                    ) of
                  Just nonEmpty -> TsData.TsTypeUnion nonEmpty
                  Nothing -> TsData.TsTypeStringLiteral "<invalid pattern>"
                _ -> TsData.TsTypeStringLiteral "<invalid pattern>"
          Nothing -> TsData.TsTypeStringLiteral "<invalid pattern miss expr>"
    , export: true
    }

identifierMaybeToTsIdentifier :: Maybe DefinyIdentifier.Identifier -> TsIdentifier.TsIdentifier
identifierMaybeToTsIdentifier = case _ of
  Just name -> TsIdentifier.fromDefinyIdentifierEscapeReserved name
  Nothing -> TsIdentifier.fromSymbolProxyUnsafe (Proxy :: Proxy "_")

definyPartialExprToTypeScriptExpr :: Maybe EvaluatedItem.PartialExpr -> TsData.Expr
definyPartialExprToTypeScriptExpr = case _ of
  Nothing -> TsData.StringLiteral "<unknown expr!!!>"
  Just (EvaluatedItem.ExprAdd { a, b }) ->
    TsData.BinaryOperator
      ( TsData.BinaryOperatorExpr
          { operator: TsData.Addition
          , left: definyPartialExprToTypeScriptExpr a
          , right: definyPartialExprToTypeScriptExpr b
          }
      )
  Just (EvaluatedItem.ExprPartReference { name }) -> TsData.Variable (TsIdentifier.fromDefinyIdentifierEscapeReserved name)
  Just (EvaluatedItem.ExprPartReferenceInvalidName {}) ->
    TsData.StringLiteral
      "<unknown part!!!>"
  Just (EvaluatedItem.ExprUIntLiteral (Just value)) ->
    TsData.NumberLiteral
      (UInt.toNumber value)
  Just (EvaluatedItem.ExprUIntLiteral Nothing) ->
    TsData.StringLiteral
      "<unknown uint literal!!!>"
  Just (EvaluatedItem.ExprTextLiteral text) -> TsData.StringLiteral text
  Just (EvaluatedItem.ExprNonEmptyTextLiteral (Just text)) ->
    TsData.StringLiteral
      (NonEmptyString.toString text)
  Just (EvaluatedItem.ExprNonEmptyTextLiteral Nothing) ->
    TsData.StringLiteral
      "<unknown nonEmptyString literal!!!>"
  Just (EvaluatedItem.ExprTypeBodySum _) ->
    TsData.StringLiteral
      "<unsupported ExprTypeBodySum>"
  Just (EvaluatedItem.ExprPattern _) ->
    TsData.StringLiteral
      "<unsupported ExprPattern>"
  Just (EvaluatedItem.ExprFloat64Literal (Just value)) -> TsData.NumberLiteral value
  Just (EvaluatedItem.ExprFloat64Literal Nothing) -> TsData.StringLiteral "<unknown float64 literal!!!>"
