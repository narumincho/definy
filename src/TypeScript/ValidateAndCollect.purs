module TypeScript.ValidateAndCollect
  ( UnknownImportedIdentifierData(..)
  , UnknownIdentifierData(..)
  , ValidateAndCollectResult(..)
  , ValidationError(..)
  , ValidationErrorWithIndex(..)
  , validateAndCollect
  ) where

import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.Tuple as Tuple
import Data.UInt as UInt
import Prelude as Prelude
import Record as Record
import Type.Proxy (Proxy(..))
import TypeScript.Data as Data
import TypeScript.Identifier as Identifier
import TypeScript.ModuleName as ModuleName
import TypeScript.ValidateAndCollectData as CollectData

-- | モジュールごとの集計結果
newtype ValidateAndCollectResult
  = ValidateAndCollectResult
  { usedNameSet :: Set.Set Identifier.TsIdentifier
  , modulePathSet :: Set.Set ModuleName.ModuleName
  , errorList :: Array ValidationErrorWithIndex
  }

concatValidateAndCollectResult :: Array ValidateAndCollectResult -> ValidateAndCollectResult
concatValidateAndCollectResult list = case Array.uncons list of
  Nothing -> validateAndCollectResultEmpty
  Just { head, tail: tailList } -> appendValidateAndCollectResult head (concatValidateAndCollectResult tailList)

appendValidateAndCollectResult ::
  ValidateAndCollectResult ->
  ValidateAndCollectResult ->
  ValidateAndCollectResult
appendValidateAndCollectResult (ValidateAndCollectResult a) (ValidateAndCollectResult b) =
  ValidateAndCollectResult
    { usedNameSet: Set.union a.usedNameSet b.usedNameSet
    , modulePathSet: Set.union a.modulePathSet b.modulePathSet
    , errorList: Prelude.append a.errorList b.errorList
    }

newtype ValidationErrorWithIndex
  = ValidationErrorWithIndex
  { index :: UInt.UInt
  , error :: ValidationError
  }

data ValidationError
  = DuplicateName
  | DuplicateIdentifier (Array Identifier.TsIdentifier)
  | UnknownTypeName UnknownIdentifierData
  | UnknownImportedTypeName UnknownImportedIdentifierData
  | UnknownVariableName UnknownIdentifierData
  | UnknownImportedVariableName UnknownImportedIdentifierData

newtype UnknownIdentifierData
  = UnknownIdentifierData
  { name :: Identifier.TsIdentifier
  , scope :: Array (Set.Set Identifier.TsIdentifier)
  }

newtype UnknownImportedIdentifierData
  = UnknownImportedIdentifierData
  { moduleName :: ModuleName.ModuleName
  , name :: Identifier.TsIdentifier
  }

validateAndCollect ::
  Data.TypeScriptModuleMap ->
  Map.Map ModuleName.ModuleName ValidateAndCollectResult
validateAndCollect typeScriptModuleMap@(Data.TypeScriptModuleMap moduleMap) =
  let
    rootIdentifierMap = collectRootIdentifierInModuleMap typeScriptModuleMap
  in
    Map.mapMaybeWithKey
      ( \moduleName content ->
          Just
            ( appendValidateAndCollectResult
                ( collectInModule
                    ( CollectData.createContextInModule
                        { moduleName
                        , rootIdentifierMap
                        }
                    )
                    content
                )
                ( ValidateAndCollectResult
                    { modulePathSet: Set.empty
                    , usedNameSet: Set.empty
                    , errorList:
                        ( Prelude.map
                            ( \index ->
                                ValidationErrorWithIndex
                                  { index, error: DuplicateName }
                            )
                            ( Set.toUnfoldable
                                ( CollectData.rootIdentifierSetInModuleGetDuplicateIndexSet
                                    ( CollectData.rootIdentifierMapGetByModuleName
                                        moduleName
                                        rootIdentifierMap
                                    )
                                )
                            )
                        )
                    }
                )
            )
      )
      moduleMap

collectRootIdentifierInModuleMap ::
  Data.TypeScriptModuleMap ->
  Map.Map ModuleName.ModuleName CollectData.RootIdentifierSetInModule
collectRootIdentifierInModuleMap (Data.TypeScriptModuleMap moduleMap) =
  Prelude.map
    collectRootIdentifierInModule
    moduleMap

collectRootIdentifierInModule ::
  Data.TypeScriptModule -> CollectData.RootIdentifierSetInModule
collectRootIdentifierInModule (Data.TypeScriptModule { exportDefinitionList }) = collectRootIdentifierInExportDefinitionList exportDefinitionList

collectRootIdentifierInExportDefinitionList ::
  Array Data.ExportDefinition ->
  CollectData.RootIdentifierSetInModule
collectRootIdentifierInExportDefinitionList list =
  Array.foldl
    ( \rootIdentifierSet (Tuple.Tuple index exportDefinition) ->
        CollectData.insertTypeOrVariableDeclaration
          ( Record.insert
              (Proxy :: _ "index")
              index
              (exportDefinitionGetNameAndExport exportDefinition)
          )
          rootIdentifierSet
    )
    CollectData.emptyRootIdentifierSetInModule
    (Array.mapWithIndex (\index -> Tuple.Tuple (UInt.fromInt index)) list)

-- | モジュール内のルートにある識別子を取得する
exportDefinitionGetNameAndExport ::
  Data.ExportDefinition ->
  { typeOrVariable :: CollectData.TypeOrVariable
  , name :: Identifier.TsIdentifier
  , export :: Boolean
  }
exportDefinitionGetNameAndExport = case _ of
  Data.ExportDefinitionTypeAlias (Data.TypeAlias { name, export }) ->
    { typeOrVariable: CollectData.Type
    , name
    , export
    }
  Data.ExportDefinitionFunction (Data.FunctionDeclaration { name, export }) ->
    { typeOrVariable: CollectData.Variable
    , name
    , export
    }
  Data.ExportDefinitionVariable (Data.VariableDeclaration { name, export }) ->
    { typeOrVariable: CollectData.Variable
    , name
    , export
    }

collectInModule ::
  CollectData.ContextInModule -> Data.TypeScriptModule -> ValidateAndCollectResult
collectInModule contextInModule (Data.TypeScriptModule { exportDefinitionList }) =
  concatValidateAndCollectResult
    ( Array.mapWithIndex
        ( \index ->
            collectInExportDefinition
              ( CollectData.contextInModuleToContextExpr
                  (UInt.fromInt index)
                  contextInModule
              )
        )
        exportDefinitionList
    )

collectInExportDefinition ::
  CollectData.ContextInExpr -> Data.ExportDefinition -> ValidateAndCollectResult
collectInExportDefinition context = case _ of
  Data.ExportDefinitionTypeAlias typeAlias -> collectInTypeAlias context typeAlias
  Data.ExportDefinitionFunction func -> collectInFunctionDeclaration context func
  Data.ExportDefinitionVariable variableDefinition -> collectInExportDefinitionVariable context variableDefinition

collectInTypeAlias ::
  CollectData.ContextInExpr ->
  Data.TypeAlias ->
  ValidateAndCollectResult
collectInTypeAlias context (Data.TypeAlias rec) =
  let
    { tsIdentifierSet, validationErrorMaybe } = checkDuplicateIdentifier rec.typeParameterList
  in
    appendValidateAndCollectResult
      ( ValidateAndCollectResult
          { modulePathSet: Set.empty
          , usedNameSet: Set.singleton rec.name
          , errorList:
              Array.catMaybes
                [ case validationErrorMaybe of
                    Just error ->
                      Just
                        ( ValidationErrorWithIndex
                            { index: CollectData.contextInExprGetIndex context
                            , error
                            }
                        )
                    Nothing -> Nothing
                ]
          }
      )
      ( collectInType
          ( CollectData.addTypeParameter
              tsIdentifierSet
              context
          )
          rec.type
      )

collectInFunctionDeclaration ::
  CollectData.ContextInExpr ->
  Data.FunctionDeclaration ->
  ValidateAndCollectResult
collectInFunctionDeclaration context (Data.FunctionDeclaration rec) =
  collectInFunction
    context
    { typeParameterList: rec.typeParameterList
    , parameterList: Prelude.map parameterWithDocumentToParameter rec.parameterList
    , returnType: rec.returnType
    , statementList: rec.statementList
    }

collectInExportDefinitionVariable ::
  CollectData.ContextInExpr ->
  Data.VariableDeclaration ->
  ValidateAndCollectResult
collectInExportDefinitionVariable context (Data.VariableDeclaration { type: tsType, expr }) =
  appendValidateAndCollectResult
    (collectInType context tsType)
    (collectInExpr context expr)

collectInType :: CollectData.ContextInExpr -> Data.TsType -> ValidateAndCollectResult
collectInType context tsType = case tsType of
  Data.TsTypeNumber -> validateAndCollectResultEmpty
  Data.TsTypeString -> validateAndCollectResultEmpty
  Data.TsTypeBoolean -> validateAndCollectResultEmpty
  Data.TsTypeUndefined -> validateAndCollectResultEmpty
  Data.TsTypeNull -> validateAndCollectResultEmpty
  Data.TsTypeNever -> validateAndCollectResultEmpty
  Data.TsTypeVoid -> validateAndCollectResultEmpty
  Data.TsTypeObject memberTypeList ->
    concatValidateAndCollectResult
      ( Prelude.map
          ( \(Data.TsMemberType member) ->
              collectInType context member.type
          )
          memberTypeList
      )
  Data.TsTypeFunction (Data.FunctionType functionType) ->
    let
      { tsIdentifierSet, validationErrorMaybe } = checkDuplicateIdentifier functionType.typeParameterList

      newContext = CollectData.addTypeParameter tsIdentifierSet context
    in
      concatValidateAndCollectResult
        ( Array.concat
            [ [ ValidateAndCollectResult
                  { modulePathSet: Set.empty
                  , usedNameSet: Set.empty
                  , errorList:
                      case validationErrorMaybe of
                        Just error ->
                          [ ValidationErrorWithIndex
                              { index: CollectData.contextInExprGetIndex context
                              , error
                              }
                          ]
                        Nothing -> []
                  }
              , collectInType
                  newContext
                  functionType.return
              ]
            , Prelude.map
                ( \parameterType ->
                    collectInType newContext parameterType
                )
                functionType.parameterList
            ]
        )
  Data.TsTypeUnion typeList ->
    concatValidateAndCollectResult
      ( Prelude.map
          ( \parameterType ->
              collectInType context parameterType
          )
          typeList
      )
  Data.TsTypeIntersection (Tuple.Tuple left right) ->
    appendValidateAndCollectResult
      (collectInType context left)
      (collectInType context right)
  Data.TsTypeImportedType (Data.ImportedType importedType@{ typeNameAndTypeParameter: Data.TypeNameAndTypeParameter { name } }) ->
    appendValidateAndCollectResult
      ( ValidateAndCollectResult
          { modulePathSet: Set.singleton importedType.moduleName
          , usedNameSet: Set.empty
          , errorList:
              if CollectData.memberTypeNameImported
                importedType.moduleName
                name
                context then
                []
              else
                [ ValidationErrorWithIndex
                    { index: CollectData.contextInExprGetIndex context
                    , error:
                        UnknownImportedTypeName
                          ( UnknownImportedIdentifierData
                              { name
                              , moduleName: importedType.moduleName
                              }
                          )
                    }
                ]
          }
      )
      ( collectInTypeNameAndTypeParameter
          context
          importedType.typeNameAndTypeParameter
      )
  Data.TsTypeScopeInFile typeNameAndTypeParameter@(Data.TypeNameAndTypeParameter { name }) ->
    appendValidateAndCollectResult
      ( ValidateAndCollectResult
          { modulePathSet: Set.empty
          , usedNameSet: Set.empty
          , errorList:
              if CollectData.memberTypeNameContextInExpr name context then
                []
              else
                [ ValidationErrorWithIndex
                    { index: CollectData.contextInExprGetIndex context
                    , error:
                        UnknownTypeName
                          ( UnknownIdentifierData
                              { name
                              , scope: CollectData.getTypeParameterSetList context
                              }
                          )
                    }
                ]
          }
      )
      ( collectInTypeNameAndTypeParameter
          context
          typeNameAndTypeParameter
      )
  Data.TsTypeScopeInGlobal typeNameAndTypeParameter ->
    collectInTypeNameAndTypeParameter
      context
      typeNameAndTypeParameter
  Data.TsTypeStringLiteral _ -> validateAndCollectResultEmpty

collectInTypeNameAndTypeParameter ::
  CollectData.ContextInExpr ->
  Data.TypeNameAndTypeParameter ->
  ValidateAndCollectResult
collectInTypeNameAndTypeParameter context (Data.TypeNameAndTypeParameter typeNameAndTypeParameter) =
  appendValidateAndCollectResult
    ( ValidateAndCollectResult
        { modulePathSet: Set.empty
        , usedNameSet: Set.singleton typeNameAndTypeParameter.name
        , errorList: []
        }
    )
    ( concatValidateAndCollectResult
        ( Prelude.map
            ( \parameterType ->
                collectInType
                  context
                  parameterType
            )
            typeNameAndTypeParameter.typeParameterList
        )
    )

validateAndCollectResultEmpty :: ValidateAndCollectResult
validateAndCollectResultEmpty =
  ValidateAndCollectResult
    { modulePathSet: Set.empty
    , usedNameSet: Set.empty
    , errorList: []
    }

checkDuplicateIdentifier ::
  Array Identifier.TsIdentifier ->
  { validationErrorMaybe :: Maybe ValidationError
  , tsIdentifierSet :: Set.Set Identifier.TsIdentifier
  }
checkDuplicateIdentifier identifierList =
  let
    tsIdentifierSet = Set.fromFoldable identifierList
  in
    { validationErrorMaybe:
        if Prelude.eq (Set.size tsIdentifierSet) (Array.length identifierList) then
          Just (DuplicateIdentifier identifierList)
        else
          Nothing
    , tsIdentifierSet
    }

collectInStatementList :: CollectData.ContextInExpr -> Array Data.Statement -> ValidateAndCollectResult
collectInStatementList context statementList =
  let
    localVariableNameSet = collectNameInStatementList statementList
  in
    appendValidateAndCollectResult
      ( ValidateAndCollectResult
          { modulePathSet: Set.empty
          , usedNameSet: localVariableNameSet
          , errorList: []
          }
      )
      ( concatValidateAndCollectResult
          ( Prelude.map
              ( collectInStatement
                  (CollectData.addLocalVariableNameSet localVariableNameSet context)
              )
              statementList
          )
      )

collectInStatement :: CollectData.ContextInExpr -> Data.Statement -> ValidateAndCollectResult
collectInStatement context = case _ of
  Data.EvaluateExpr expr -> collectInExpr context expr
  Data.Set (Data.SetStatement { target, expr }) ->
    appendValidateAndCollectResult
      (collectInExpr context expr)
      (collectInExpr context target)
  Data.If (Data.IfStatement { condition, thenStatementList }) ->
    appendValidateAndCollectResult
      (collectInExpr context condition)
      (collectInStatementList context thenStatementList)
  Data.ThrowError expr -> collectInExpr context expr
  Data.Return expr -> collectInExpr context expr
  Data.ReturnVoid -> validateAndCollectResultEmpty
  Data.Continue -> validateAndCollectResultEmpty
  Data.VariableDefinition (Data.VariableDefinitionStatement { expr, type: tsType }) ->
    appendValidateAndCollectResult
      (collectInExpr context expr)
      (collectInType context tsType)
  Data.FunctionDefinition (Data.FunctionDefinitionStatement rec) ->
    collectInFunction
      context
      { typeParameterList: rec.typeParameterList
      , parameterList: Prelude.map parameterWithDocumentToParameter rec.parameterList
      , returnType: rec.returnType
      , statementList: rec.statementList
      }
  Data.For (Data.ForStatement { counterVariableName, untilExpr, statementList }) ->
    let
      newContext = CollectData.addLocalVariableNameSet (Set.singleton counterVariableName) context
    in
      appendValidateAndCollectResult
        ( ValidateAndCollectResult
            { modulePathSet: Set.empty
            , usedNameSet: Set.singleton counterVariableName
            , errorList: []
            }
        )
        ( appendValidateAndCollectResult
            (collectInExpr newContext untilExpr)
            (collectInStatementList newContext statementList)
        )
  Data.ForOf (Data.ForOfStatement { elementVariableName, iterableExpr, statementList }) ->
    let
      newContext = CollectData.addLocalVariableNameSet (Set.singleton elementVariableName) context
    in
      appendValidateAndCollectResult
        ( ValidateAndCollectResult
            { modulePathSet: Set.empty
            , usedNameSet: Set.singleton elementVariableName
            , errorList: []
            }
        )
        ( appendValidateAndCollectResult
            (collectInExpr context iterableExpr)
            (collectInStatementList newContext statementList)
        )
  Data.WhileTrue statementList -> collectInStatementList context statementList
  Data.Break -> validateAndCollectResultEmpty
  Data.Switch (Data.SwitchStatement { expr, patternList }) ->
    appendValidateAndCollectResult
      (collectInExpr context expr)
      ( concatValidateAndCollectResult
          ( Prelude.map
              ( \(Data.Pattern { statementList }) ->
                  collectInStatementList context statementList
              )
              patternList
          )
      )

collectNameInStatementList :: Array Data.Statement -> Set.Set Identifier.TsIdentifier
collectNameInStatementList statementList =
  -- TODO 重複チェック
  Set.fromFoldable
    (Array.mapMaybe collectNameInStatement statementList)

collectNameInStatement :: Data.Statement -> Maybe Identifier.TsIdentifier
collectNameInStatement = case _ of
  Data.VariableDefinition (Data.VariableDefinitionStatement { name }) -> Just name
  Data.FunctionDefinition (Data.FunctionDefinitionStatement { name }) -> Just name
  _ -> Nothing

collectInExpr :: CollectData.ContextInExpr -> Data.Expr -> ValidateAndCollectResult
collectInExpr context = case _ of
  Data.NumberLiteral _ -> validateAndCollectResultEmpty
  Data.StringLiteral _ -> validateAndCollectResultEmpty
  Data.BooleanLiteral _ -> validateAndCollectResultEmpty
  Data.NullLiteral -> validateAndCollectResultEmpty
  Data.UndefinedLiteral -> validateAndCollectResultEmpty
  Data.UnaryOperator (Data.UnaryOperatorExpr { expr }) -> collectInExpr context expr
  Data.BinaryOperator (Data.BinaryOperatorExpr { left, right }) ->
    appendValidateAndCollectResult
      (collectInExpr context left)
      (collectInExpr context right)
  Data.ConditionalOperator (Data.ConditionalOperatorExpr { condition, thenExpr, elseExpr }) ->
    appendValidateAndCollectResult
      (collectInExpr context condition)
      ( appendValidateAndCollectResult
          (collectInExpr context thenExpr)
          (collectInExpr context elseExpr)
      )
  Data.ArrayLiteral array ->
    concatValidateAndCollectResult
      ( Prelude.map
          (\(Data.ArrayItem { expr }) -> collectInExpr context expr)
          array
      )
  Data.ObjectLiteral memberArray ->
    concatValidateAndCollectResult
      ( Prelude.map
          ( case _ of
              Data.MemberSpread expr -> collectInExpr context expr
              Data.MemberKeyValue (Data.KeyValue { value }) -> collectInExpr context value
          )
          memberArray
      )
  Data.Lambda (Data.LambdaExpr lambdaRec) -> collectInFunction context lambdaRec
  Data.Variable name ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.singleton name
      , errorList:
          if CollectData.memberVariableNameContextInExpr name context then
            []
          else
            [ ValidationErrorWithIndex
                { index: CollectData.contextInExprGetIndex context
                , error:
                    UnknownVariableName
                      ( UnknownIdentifierData
                          { name
                          , scope: CollectData.getLocalVariableNameSetList context
                          }
                      )
                }
            ]
      }
  Data.GlobalObjects _ -> validateAndCollectResultEmpty
  Data.ExprImportedVariable (Data.ImportedVariable { moduleName, name }) ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList:
          if CollectData.memberVariableNameImported moduleName name context then
            []
          else
            [ ValidationErrorWithIndex
                { index: CollectData.contextInExprGetIndex context
                , error:
                    UnknownVariableName
                      ( UnknownIdentifierData
                          { name
                          , scope: CollectData.getLocalVariableNameSetList context
                          }
                      )
                }
            ]
      }
  Data.Get (Data.GetExpr { expr, propertyExpr }) ->
    appendValidateAndCollectResult
      (collectInExpr context expr)
      (collectInExpr context propertyExpr)
  Data.Call callExpr -> collectInCallExpr context callExpr
  Data.New callExpr -> collectInCallExpr context callExpr
  Data.ExprTypeAssertion (Data.TypeAssertion { type: tsType, expr }) ->
    appendValidateAndCollectResult
      (collectInExpr context expr)
      (collectInType context tsType)

collectInFunction ::
  CollectData.ContextInExpr ->
  { typeParameterList :: Array Identifier.TsIdentifier
  , parameterList :: Array Data.Parameter
  , returnType :: Data.TsType
  , statementList :: Array Data.Statement
  } ->
  ValidateAndCollectResult
collectInFunction context rec =
  let
    { tsIdentifierSet, validationErrorMaybe } = checkDuplicateIdentifier rec.typeParameterList

    { validationErrorMaybe: parameterErrorMaybe } =
      checkDuplicateIdentifier
        ( Prelude.map
            (\(Data.Parameter { name }) -> name)
            rec.parameterList
        )

    newContext =
      CollectData.addTypeParameter
        tsIdentifierSet
        context
  in
    concatValidateAndCollectResult
      [ ValidateAndCollectResult
          { modulePathSet: Set.empty
          , usedNameSet: Set.empty
          , errorList:
              Array.catMaybes
                [ case validationErrorMaybe of
                    Just error ->
                      Just
                        ( ValidationErrorWithIndex
                            { index: CollectData.contextInExprGetIndex context
                            , error
                            }
                        )
                    Nothing -> Nothing
                , case parameterErrorMaybe of
                    Just error ->
                      Just
                        ( ValidationErrorWithIndex
                            { index: CollectData.contextInExprGetIndex context
                            , error
                            }
                        )
                    Nothing -> Nothing
                ]
          }
      , concatValidateAndCollectResult
          ( Prelude.map
              ( \(Data.Parameter { type: tsType }) ->
                  collectInType newContext tsType
              )
              rec.parameterList
          )
      , collectInStatementList newContext rec.statementList
      , collectInType
          (CollectData.addTypeParameter tsIdentifierSet context)
          rec.returnType
      ]

collectInCallExpr :: CollectData.ContextInExpr -> Data.CallExpr -> ValidateAndCollectResult
collectInCallExpr context (Data.CallExpr { expr, parameterList }) =
  appendValidateAndCollectResult
    (collectInExpr context expr)
    (concatValidateAndCollectResult (Prelude.map (collectInExpr context) parameterList))

parameterWithDocumentToParameter :: Data.ParameterWithDocument -> Data.Parameter
parameterWithDocumentToParameter (Data.ParameterWithDocument rec) =
  Data.Parameter
    ( Record.delete (Proxy :: _ "document") rec
    )
