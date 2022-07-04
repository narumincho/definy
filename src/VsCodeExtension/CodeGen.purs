module VsCodeExtension.CodeGen
  ( codeAsBinary
  ) where

import Binary as Binary
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import FileSystem.Name as FileSystemName
import FileSystem.Path as FileSystemPath
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import TypeScript.Data as TsData
import TypeScript.Identifier as TsIdentifier
import TypeScript.ModuleName as TsModuleName
import TypeScript.ToString as TsToString
import VsCodeExtension.Evaluate as Evaluate

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
            Evaluate.Module definyModule -> definyPartialModuleToTypeScriptModule definyModule
            _ ->
              ( TsData.Module
                  { exportDefinitionList: []
                  , moduleDocument: "コードの木構造の直下がモジュールでない!"
                  }
              )
        )
    )

definyPartialModuleToTypeScriptModule :: Evaluate.PartialModule -> TsData.Module
definyPartialModuleToTypeScriptModule (Evaluate.PartialModule partialModule) =
  TsData.Module
    { exportDefinitionList:
        Prelude.map
          definyPartialPartToExportVariable
          partialModule.partList
    , moduleDocument: partialModule.description
    }

definyPartialPartToExportVariable :: Evaluate.PartialPart -> TsData.ExportDefinition
definyPartialPartToExportVariable (Evaluate.PartialPart partialPart) =
  TsData.ExportDefinitionVariable
    ( TsData.VariableDeclaration
        { name:
            case partialPart.name of
              Just name -> TsIdentifier.fromDefinyIdentifierEscapeReserved name
              Nothing -> TsIdentifier.fromSymbolProxyUnsafe (Proxy :: Proxy "_")
        , document: partialPart.description
        , type:
            case partialPart.expr of
              Nothing -> TsData.TsTypeUnknown
              Just (Evaluate.ExprAdd _) -> TsData.TsTypeNumber
              Just (Evaluate.ExprPartReference _) -> TsData.TsTypeUnknown
              Just (Evaluate.ExprPartReferenceInvalidName _) -> TsData.TsTypeUnknown
              Just (Evaluate.ExprUIntLiteral _) -> TsData.TsTypeNumber
              Just (Evaluate.ExprTextLiteral _) -> TsData.TsTypeString
              Just (Evaluate.ExprNonEmptyTextLiteral _) -> TsData.TsTypeString
              Just (Evaluate.ExprFloat64Literal _) -> TsData.TsTypeNumber
        , expr: definyPartialExprToTypeScriptExpr partialPart.expr
        , export: true
        }
    )

definyPartialExprToTypeScriptExpr :: Maybe Evaluate.PartialExpr -> TsData.Expr
definyPartialExprToTypeScriptExpr = case _ of
  Nothing -> TsData.StringLiteral "<unknown expr!!!>"
  Just (Evaluate.ExprAdd { a, b }) ->
    TsData.BinaryOperator
      ( TsData.BinaryOperatorExpr
          { operator: TsData.Addition
          , left: definyPartialExprToTypeScriptExpr a
          , right: definyPartialExprToTypeScriptExpr b
          }
      )
  Just (Evaluate.ExprPartReference { name }) -> TsData.Variable (TsIdentifier.fromDefinyIdentifierEscapeReserved name)
  Just (Evaluate.ExprPartReferenceInvalidName {}) ->
    TsData.StringLiteral
      "<unknown part!!!>"
  Just (Evaluate.ExprUIntLiteral (Just value)) ->
    TsData.NumberLiteral
      (UInt.toNumber value)
  Just (Evaluate.ExprUIntLiteral Nothing) ->
    TsData.StringLiteral
      "<unknown uint literal!!!>"
  Just (Evaluate.ExprTextLiteral text) -> TsData.StringLiteral text
  Just (Evaluate.ExprNonEmptyTextLiteral (Just text)) ->
    TsData.StringLiteral
      (NonEmptyString.toString text)
  Just (Evaluate.ExprNonEmptyTextLiteral Nothing) ->
    TsData.StringLiteral
      "<unknown nonEmptyString literal!!!>"
  Just (Evaluate.ExprFloat64Literal (Just value)) -> TsData.NumberLiteral value
  Just (Evaluate.ExprFloat64Literal Nothing) -> TsData.StringLiteral "<unknown float64 literal!!!>"
