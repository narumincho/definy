module TypeScript.ValidateAndCollect
  ( UnknownTypeNameData(..)
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
  = NotImplemented
  | DuplicateName
  | DuplicateIdentifier (Array Identifier.TsIdentifier)
  | UnknownTypeName UnknownTypeNameData

newtype UnknownTypeNameData
  = UnknownTypeNameData
  { typeName :: Identifier.TsIdentifier
  , scope :: Array (Set.Set Identifier.TsIdentifier)
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
            ( collectInModule
                ( CollectData.createContextInModule
                    { moduleName
                    , rootIdentifierMap
                    }
                )
                content
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

collectRootIdentifierInExportDefinitionList :: Array Data.ExportDefinition -> CollectData.RootIdentifierSetInModule
collectRootIdentifierInExportDefinitionList list = case Array.uncons list of
  Nothing -> CollectData.emptyRootIdentifierSetInModule
  Just { head, tail } ->
    collectRootIdentifierInExportDefinition
      head
      (collectRootIdentifierInExportDefinitionList tail)

-- | モジュール内のルートにある識別子を取得する
collectRootIdentifierInExportDefinition ::
  Data.ExportDefinition ->
  CollectData.RootIdentifierSetInModule ->
  CollectData.RootIdentifierSetInModule
collectRootIdentifierInExportDefinition head tail = case head of
  Data.ExportDefinitionTypeAlias (Data.TypeAlias { name }) ->
    CollectData.insertTypeName
      name
      tail
  Data.ExportDefinitionFunction (Data.FunctionDeclaration { name }) ->
    CollectData.insertVariableName
      name
      tail
  Data.ExportDefinitionVariable (Data.VariableDeclaration { name }) ->
    CollectData.insertVariableName
      name
      tail

collectInModule ::
  CollectData.ContextInModule -> Data.TypeScriptModule -> ValidateAndCollectResult
collectInModule contextInModule (Data.TypeScriptModule { exportDefinitionList }) =
  concatValidateAndCollectResult
    ( Array.mapWithIndex
        ( \index ->
            collectInExportDefinition
              ( CollectData.contextInModuleToContextExportDefinition
                  (UInt.fromInt index)
                  contextInModule
              )
        )
        exportDefinitionList
    )

collectInExportDefinition ::
  CollectData.ContextInExportDefinition -> Data.ExportDefinition -> ValidateAndCollectResult
collectInExportDefinition context = case _ of
  Data.ExportDefinitionTypeAlias typeAlias -> collectInTypeAlias context typeAlias
  Data.ExportDefinitionFunction func -> collectInFunctionDeclaration context func
  Data.ExportDefinitionVariable variableDefinition ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index: CollectData.contextInExportDefinitionGetIndex context, error: NotImplemented } ]
      }

collectInTypeAlias ::
  CollectData.ContextInExportDefinition ->
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
                            { index: CollectData.contextInExportDefinitionGetIndex context
                            , error
                            }
                        )
                    Nothing -> Nothing
                ]
          }
      )
      ( collectInType
          ( CollectData.contextExportDefinitionToContextInExpr
              tsIdentifierSet
              context
          )
          rec.type
      )

collectInFunctionDeclaration ::
  CollectData.ContextInExportDefinition ->
  Data.FunctionDeclaration ->
  ValidateAndCollectResult
collectInFunctionDeclaration context (Data.FunctionDeclaration rec) =
  let
    { tsIdentifierSet, validationErrorMaybe } = checkDuplicateIdentifier rec.typeParameterList

    { validationErrorMaybe: parameterErrorMaybe } =
      checkDuplicateIdentifier
        ( Prelude.map
            (\(Data.ParameterWithDocument { name }) -> name)
            rec.parameterList
        )
  in
    concatValidateAndCollectResult
      ( Array.concat
          [ [ ValidateAndCollectResult
                { modulePathSet: Set.empty
                , usedNameSet: Set.singleton rec.name
                , errorList:
                    Array.catMaybes
                      [ case validationErrorMaybe of
                          Just error ->
                            Just
                              ( ValidationErrorWithIndex
                                  { index: CollectData.contextInExportDefinitionGetIndex context
                                  , error
                                  }
                              )
                          Nothing -> Nothing
                      , case parameterErrorMaybe of
                          Just error -> Just (ValidationErrorWithIndex { index: CollectData.contextInExportDefinitionGetIndex context, error })
                          Nothing -> Nothing
                      ]
                }
            , collectInType
                ( CollectData.contextExportDefinitionToContextInExpr
                    tsIdentifierSet
                    context
                )
                rec.returnType
            , collectInStatementList
                ( CollectData.contextExportDefinitionToContextInExpr
                    tsIdentifierSet
                    context
                )
                rec.statementList
            ]
          , Prelude.map
              ( \(Data.ParameterWithDocument { type: tsType }) ->
                  collectInType
                    ( CollectData.contextExportDefinitionToContextInExpr
                        tsIdentifierSet
                        context
                    )
                    tsType
              )
              rec.parameterList
          ]
      )

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
    concatValidateAndCollectResult
      [ ValidateAndCollectResult
          { modulePathSet: Set.singleton importedType.moduleName
          , usedNameSet: Set.empty
          , errorList: []
          }
      , ValidateAndCollectResult
          { modulePathSet: Set.empty
          , usedNameSet: Set.empty
          , errorList:
              case checkTypeIsDefined
                  ( CollectData.setModuleName
                      importedType.moduleName
                      context
                  )
                  name of
                Just error ->
                  [ ValidationErrorWithIndex
                      { index: CollectData.contextInExprGetIndex context
                      , error: UnknownTypeName error
                      }
                  ]
                Nothing -> []
          }
      , collectInTypeNameAndTypeParameter
          context
          importedType.typeNameAndTypeParameter
      ]
  Data.TsTypeScopeInFile typeNameAndTypeParameter@(Data.TypeNameAndTypeParameter { name }) ->
    appendValidateAndCollectResult
      ( ValidateAndCollectResult
          { modulePathSet: Set.empty
          , usedNameSet: Set.empty
          , errorList:
              case checkTypeIsDefined context name of
                Just error ->
                  [ ValidationErrorWithIndex
                      { index: CollectData.contextInExprGetIndex context
                      , error: UnknownTypeName error
                      }
                  ]
                Nothing -> []
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

checkTypeIsDefined ::
  CollectData.ContextInExpr ->
  Identifier.TsIdentifier ->
  Maybe UnknownTypeNameData
checkTypeIsDefined context typeName =
  if CollectData.memberTypeNameContextInExpr typeName context then
    Nothing
  else
    Just
      ( UnknownTypeNameData
          { typeName
          , scope: CollectData.getTypeParameterSetList context
          }
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
    concatValidateAndCollectResult
      ( Prelude.map
          ( collectInStatement
              (CollectData.addLocalVariableNameSet localVariableNameSet context)
          )
          statementList
      )

collectInStatement :: CollectData.ContextInExpr -> Data.Statement -> ValidateAndCollectResult
collectInStatement context = case _ of
  _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index: CollectData.contextInExprGetIndex context, error: NotImplemented } ]
      }

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
  Data.Variable _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index: CollectData.contextInExprGetIndex context, error: NotImplemented } ]
      }
  Data.GlobalObjects _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index: CollectData.contextInExprGetIndex context, error: NotImplemented } ]
      }
  Data.ExprImportedVariable _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index: CollectData.contextInExprGetIndex context, error: NotImplemented } ]
      }
  Data.Get _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index: CollectData.contextInExprGetIndex context, error: NotImplemented } ]
      }
  Data.Call callExpr -> collectInCallExpr context callExpr
  Data.New callExpr -> collectInCallExpr context callExpr
  Data.ExprTypeAssertion _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index: CollectData.contextInExprGetIndex context, error: NotImplemented } ]
      }

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
  in
    appendValidateAndCollectResult
      ( ValidateAndCollectResult
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
      )
      ( collectInType
          (CollectData.addTypeParameter tsIdentifierSet context)
          rec.returnType
      )

collectInCallExpr :: CollectData.ContextInExpr -> Data.CallExpr -> ValidateAndCollectResult
collectInCallExpr context (Data.CallExpr { expr, parameterList }) =
  appendValidateAndCollectResult
    (collectInExpr context expr)
    (concatValidateAndCollectResult (Prelude.map (collectInExpr context) parameterList))
