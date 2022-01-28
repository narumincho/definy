module TypeScript.ValidateAndCollect
  ( RootIdentifierSetInModule(..)
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
  Just { head: ValidateAndCollectResult head, tail: tailList } ->
    let
      (ValidateAndCollectResult tail) = concatValidateAndCollectResult tailList
    in
      ValidateAndCollectResult
        { usedNameSet: Set.union head.usedNameSet tail.usedNameSet
        , modulePathSet: Set.union head.modulePathSet tail.modulePathSet
        , errorList: Prelude.append head.errorList tail.errorList
        }

newtype ValidationErrorWithIndex
  = ValidationErrorWithIndex
  { index :: UInt.UInt
  , error :: ValidationError
  }

data ValidationError
  = NotImplemented
  | DuplicateName

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

newtype ContextInModule
  = ContextInModule
  { moduleName :: ModuleName.ModuleName
  , rootIdentifierMap :: Map.Map ModuleName.ModuleName RootIdentifierSetInModule
  }

newtype ContextInExportDefinition
  = ContextInExportDefinition
  { moduleName :: ModuleName.ModuleName
  , rootIdentifierMap :: Map.Map ModuleName.ModuleName RootIdentifierSetInModule
  , index :: UInt.UInt
  }

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
  Data.ExportDefinitionFunction func ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
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
collectInTypeAlias context@(ContextInExportDefinition { moduleName, rootIdentifierMap, index }) (Data.TypeAlias rec) =
  concatValidateAndCollectResult
    [ ValidateAndCollectResult
        { modulePathSet: Set.empty
        , usedNameSet: Set.singleton rec.name
        , errorList:
            case Map.lookup moduleName rootIdentifierMap of
              Just (RootIdentifierSetInModule { rootTypeNameSet }) ->
                if Set.member rec.name rootTypeNameSet then
                  [ ValidationErrorWithIndex { index, error: DuplicateName } ]
                else
                  []
              Nothing -> []
        }
    , collectInType
        { context
        , tsType: rec.type
        , typeParameterSetList: [ Set.fromFoldable rec.typeParameterList ]
        }
    ]

collectInType ::
  { context :: ContextInExportDefinition
  , tsType :: Data.TsType
  , typeParameterSetList :: Array (Set.Set Identifier.TsIdentifier)
  } ->
  ValidateAndCollectResult
collectInType { context: context@(ContextInExportDefinition { index })
, tsType
, typeParameterSetList
} = case tsType of
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
              collectInType { context, tsType: member.type, typeParameterSetList }
          )
          memberTypeList
      )
  Data.TsTypeFunction functionType ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
  Data.TsTypeUnion typeList ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
  Data.TsTypeIntersection (Tuple.Tuple left right) ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
  Data.TsTypeImportedType importedType ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
  Data.TsTypeScopeInFile typeNameAndTypeParameter ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
  Data.TsTypeScopeInGlobal typeNameAndTypeParameter ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }
  Data.TsTypeStringLiteral string ->
    ValidateAndCollectResult
      { modulePathSet: Set.empty
      , usedNameSet: Set.empty
      , errorList: [ ValidationErrorWithIndex { index, error: NotImplemented } ]
      }

validateAndCollectResultEmpty :: ValidateAndCollectResult
validateAndCollectResultEmpty =
  ValidateAndCollectResult
    { modulePathSet: Set.empty
    , usedNameSet: Set.empty
    , errorList: []
    }
