module TypeScript.ValidateAndCollect
  ( RootIdentifierSetInModule(..)
  , UnknownTypeNameData(..)
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
                ( ContextInModule
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
  Map.Map ModuleName.ModuleName RootIdentifierSetInModule
collectRootIdentifierInModuleMap (Data.TypeScriptModuleMap moduleMap) =
  Prelude.map
    collectRootIdentifierInModule
    moduleMap

newtype RootIdentifierSetInModule
  = RootIdentifierSetInModule
  { rootTypeNameSet :: Set.Set Identifier.TsIdentifier
  , rootVariableNameSet :: Set.Set Identifier.TsIdentifier
  }

collectRootIdentifierInModule ::
  Data.TypeScriptModule -> RootIdentifierSetInModule
collectRootIdentifierInModule (Data.TypeScriptModule { exportDefinitionList }) = collectRootIdentifierInExportDefinitionList exportDefinitionList

collectRootIdentifierInExportDefinitionList :: Array Data.ExportDefinition -> RootIdentifierSetInModule
collectRootIdentifierInExportDefinitionList list = case Array.uncons list of
  Nothing ->
    RootIdentifierSetInModule
      { rootTypeNameSet: Set.empty, rootVariableNameSet: Set.empty }
  Just { head, tail } ->
    collectRootIdentifierInExportDefinition
      head
      (collectRootIdentifierInExportDefinitionList tail)

-- | モジュール内のルートにある識別子を取得する
collectRootIdentifierInExportDefinition ::
  Data.ExportDefinition ->
  RootIdentifierSetInModule ->
  RootIdentifierSetInModule
collectRootIdentifierInExportDefinition head (RootIdentifierSetInModule tail) = case head of
  Data.ExportDefinitionTypeAlias (Data.TypeAlias { name }) ->
    RootIdentifierSetInModule
      ( tail
          { rootTypeNameSet = Set.insert name tail.rootTypeNameSet }
      )
  Data.ExportDefinitionFunction (Data.FunctionDeclaration { name }) ->
    RootIdentifierSetInModule
      ( tail
          { rootVariableNameSet = Set.insert name tail.rootVariableNameSet }
      )
  Data.ExportDefinitionVariable (Data.VariableDeclaration { name }) ->
    RootIdentifierSetInModule
      ( tail
          { rootVariableNameSet = Set.insert name tail.rootVariableNameSet }
      )

rootIdentifierSetInModuleMemberType ::
  Identifier.TsIdentifier ->
  RootIdentifierSetInModule ->
  Boolean
rootIdentifierSetInModuleMemberType typeName (RootIdentifierSetInModule { rootTypeNameSet }) = Set.member typeName rootTypeNameSet

rootIdentifierSetInModuleMemberVariable ::
  Identifier.TsIdentifier ->
  RootIdentifierSetInModule ->
  Boolean
rootIdentifierSetInModuleMemberVariable variableName (RootIdentifierSetInModule { rootVariableNameSet }) = Set.member variableName rootVariableNameSet

type ContextInModuleRecord :: Row Type
type ContextInModuleRecord
  = ( moduleName :: ModuleName.ModuleName
    , rootIdentifierMap :: Map.Map ModuleName.ModuleName RootIdentifierSetInModule
    )

newtype ContextInModule
  = ContextInModule (Record ContextInModuleRecord)

type ContextInExportDefinitionRecord :: Row Type
type ContextInExportDefinitionRecord
  = ( index :: UInt.UInt | ContextInModuleRecord )

newtype ContextInExportDefinition
  = ContextInExportDefinition (Record ContextInExportDefinitionRecord)

collectInModule ::
  ContextInModule -> Data.TypeScriptModule -> ValidateAndCollectResult
collectInModule (ContextInModule contextRec) (Data.TypeScriptModule { exportDefinitionList }) =
  concatValidateAndCollectResult
    ( Array.mapWithIndex
        ( \index ->
            collectInExportDefinition
              ( ContextInExportDefinition
                  (Record.insert (Proxy :: _ "index") (UInt.fromInt index) contextRec)
              )
        )
        exportDefinitionList
    )

collectInExportDefinition ::
  ContextInExportDefinition -> Data.ExportDefinition -> ValidateAndCollectResult
collectInExportDefinition context@(ContextInExportDefinition { index }) = case _ of
  Data.ExportDefinitionTypeAlias typeAlias -> collectInTypeAlias context typeAlias
  Data.ExportDefinitionFunction func -> collectInFunctionDeclaration context func
  Data.ExportDefinitionVariable variableDefinition ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }

collectInTypeAlias ::
  ContextInExportDefinition ->
  Data.TypeAlias ->
  ValidateAndCollectResult
collectInTypeAlias (ContextInExportDefinition { moduleName, rootIdentifierMap, index }) (Data.TypeAlias rec) =
  let
    { tsIdentifierSet, validationErrorMaybe } = checkDuplicateIdentifier rec.typeParameterList
  in
    appendValidateAndCollectResult
      ( ValidateAndCollectResult
          { modulePathSet: Set.empty
          , usedNameSet: Set.singleton rec.name
          , errorList:
              Array.catMaybes
                [ case Map.lookup moduleName rootIdentifierMap of
                    Just rootIdentifierSetInModule ->
                      if rootIdentifierSetInModuleMemberType rec.name rootIdentifierSetInModule then
                        Just (ValidationErrorWithIndex { index, error: DuplicateName })
                      else
                        Nothing
                    Nothing -> Nothing
                , case validationErrorMaybe of
                    Just error -> Just (ValidationErrorWithIndex { index, error })
                    Nothing -> Nothing
                ]
          }
      )
      ( collectInType
          ( ContextInType
              { moduleName
              , rootIdentifierMap
              , index
              , typeParameterSetList: [ tsIdentifierSet ]
              }
          )
          rec.type
      )

collectInFunctionDeclaration ::
  ContextInExportDefinition ->
  Data.FunctionDeclaration ->
  ValidateAndCollectResult
collectInFunctionDeclaration context@(ContextInExportDefinition { moduleName, rootIdentifierMap, index }) (Data.FunctionDeclaration rec) =
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
                      [ case Map.lookup moduleName rootIdentifierMap of
                          Just rootIdentifierSetInModule ->
                            if rootIdentifierSetInModuleMemberVariable rec.name rootIdentifierSetInModule then
                              Just (ValidationErrorWithIndex { index, error: DuplicateName })
                            else
                              Nothing
                          Nothing -> Nothing
                      , case validationErrorMaybe of
                          Just error -> Just (ValidationErrorWithIndex { index, error })
                          Nothing -> Nothing
                      , case parameterErrorMaybe of
                          Just error -> Just (ValidationErrorWithIndex { index, error })
                          Nothing -> Nothing
                      ]
                }
            , collectInType
                ( ContextInType
                    { moduleName
                    , rootIdentifierMap
                    , index
                    , typeParameterSetList: [ tsIdentifierSet ]
                    }
                )
                rec.returnType
            , collectInStatementList
                ( ContextInExpr
                    { moduleName
                    , rootIdentifierMap
                    , index
                    , typeParameterSetList: [ tsIdentifierSet ]
                    , localVariableNameSetList: []
                    }
                )
                rec.statementList
            ]
          , Prelude.map
              ( \(Data.ParameterWithDocument { type: tsType }) ->
                  collectInType
                    ( ContextInType
                        { moduleName
                        , rootIdentifierMap
                        , index
                        , typeParameterSetList: [ tsIdentifierSet ]
                        }
                    )
                    tsType
              )
              rec.parameterList
          ]
      )

type ContextInTypeRecord :: Row Type
type ContextInTypeRecord
  = ( typeParameterSetList :: Array (Set.Set Identifier.TsIdentifier)
    | ContextInExportDefinitionRecord
    )

newtype ContextInType
  = ContextInType (Record ContextInTypeRecord)

contextInTypeAddTypeParameter :: Set.Set Identifier.TsIdentifier -> ContextInType -> ContextInType
contextInTypeAddTypeParameter identifierSet (ContextInType rec) =
  ContextInType
    ( rec
        { typeParameterSetList = Array.snoc rec.typeParameterSetList identifierSet
        }
    )

collectInType :: ContextInType -> Data.TsType -> ValidateAndCollectResult
collectInType context@(ContextInType { index, rootIdentifierMap, typeParameterSetList }) tsType = case tsType of
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

      newContext = contextInTypeAddTypeParameter tsIdentifierSet context
    in
      concatValidateAndCollectResult
        ( Array.concat
            [ [ ValidateAndCollectResult
                  { modulePathSet: Set.empty
                  , usedNameSet: Set.empty
                  , errorList:
                      case validationErrorMaybe of
                        Just error -> [ ValidationErrorWithIndex { index, error } ]
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
                  ( ContextInType
                      { index
                      , rootIdentifierMap
                      , moduleName: importedType.moduleName
                      , typeParameterSetList
                      }
                  )
                  name of
                Just error ->
                  [ ValidationErrorWithIndex
                      { index
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
                      { index
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
  ContextInType ->
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
  ContextInType ->
  Identifier.TsIdentifier ->
  Maybe UnknownTypeNameData
checkTypeIsDefined (ContextInType context) typeName =
  if rootIdentifierSetInModuleMemberType
    typeName
    ( getRootIdentifierSetInModule
        { moduleName: context.moduleName, rootIdentifierMap: context.rootIdentifierMap }
    ) then
    Nothing
  else if Array.any (Set.member typeName) context.typeParameterSetList then
    Nothing
  else
    Just
      ( UnknownTypeNameData
          { typeName
          , scope: context.typeParameterSetList
          }
      )

getRootIdentifierSetInModule :: Record ContextInModuleRecord -> RootIdentifierSetInModule
getRootIdentifierSetInModule ({ moduleName, rootIdentifierMap }) = case Map.lookup moduleName rootIdentifierMap of
  Just rootIdentifierSetInModule -> rootIdentifierSetInModule
  Nothing ->
    RootIdentifierSetInModule
      { rootTypeNameSet: Set.empty, rootVariableNameSet: Set.empty }

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

newtype ContextInExpr
  = ContextInExpr
  { localVariableNameSetList :: Array (Set.Set Identifier.TsIdentifier)
  | ContextInTypeRecord
  }

contextInExprAppendLocalVariableNameSet ::
  Set.Set Identifier.TsIdentifier ->
  ContextInExpr ->
  ContextInExpr
contextInExprAppendLocalVariableNameSet localVariableNameSet (ContextInExpr rec) =
  ContextInExpr
    ( rec
        { localVariableNameSetList =
          Array.snoc rec.localVariableNameSetList localVariableNameSet
        }
    )

collectInStatementList :: ContextInExpr -> Array Data.Statement -> ValidateAndCollectResult
collectInStatementList context statementList =
  let
    localVariableNameSet = collectNameInStatementList statementList
  in
    concatValidateAndCollectResult
      ( Prelude.map
          ( collectInStatement
              (contextInExprAppendLocalVariableNameSet localVariableNameSet context)
          )
          statementList
      )

collectInStatement :: ContextInExpr -> Data.Statement -> ValidateAndCollectResult
collectInStatement (ContextInExpr { index }) = case _ of
  _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
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

collectInExpr :: ContextInExpr -> Data.Expr -> ValidateAndCollectResult
collectInExpr context@(ContextInExpr { index }) = case _ of
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
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
  Data.GlobalObjects _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
  Data.ExprImportedVariable _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
  Data.Get _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
  Data.Call callExpr -> collectInCallExpr context callExpr
  Data.New callExpr -> collectInCallExpr context callExpr
  Data.ExprTypeAssertion _ ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }

collectInFunction ::
  ContextInExpr ->
  { typeParameterList :: Array Identifier.TsIdentifier
  , parameterList :: Array Data.Parameter
  , returnType :: Data.TsType
  , statementList :: Array Data.Statement
  } ->
  ValidateAndCollectResult
collectInFunction (ContextInExpr (contextRec@{ index })) rec =
  let
    { tsIdentifierSet, validationErrorMaybe } = checkDuplicateIdentifier rec.typeParameterList
  in
    appendValidateAndCollectResult
      ( ValidateAndCollectResult
          { modulePathSet: Set.empty
          , usedNameSet: Set.empty
          , errorList:
              case validationErrorMaybe of
                Just error -> [ ValidationErrorWithIndex { index, error } ]
                Nothing -> []
          }
      )
      ( collectInType
          ( contextInTypeAddTypeParameter
              tsIdentifierSet
              ( ContextInType
                  (Record.delete (Proxy :: _ "localVariableNameSetList") contextRec)
              )
          )
          rec.returnType
      )

collectInCallExpr :: ContextInExpr -> Data.CallExpr -> ValidateAndCollectResult
collectInCallExpr context (Data.CallExpr { expr, parameterList }) =
  appendValidateAndCollectResult
    (collectInExpr context expr)
    (concatValidateAndCollectResult (Prelude.map (collectInExpr context) parameterList))
