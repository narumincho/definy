module TypeScript.ValidateAndCollectData
  ( ContextInExpr
  , ContextInModule
  , RootIdentifierSetInModule
  , TypeOrVariable(..)
  , addLocalVariableNameSet
  , addTypeParameter
  , contextInExprGetIndex
  , contextInModuleToContextExpr
  , createContextInModule
  , emptyRootIdentifierSetInModule
  , getLocalVariableNameSetList
  , getTypeParameterSetList
  , insertTypeOrVariableDeclaration
  , insertVariableName
  , memberTypeNameContextInExpr
  , memberTypeNameImported
  , memberVariableNameContextInExpr
  , memberVariableNameImported
  , rootIdentifierMapGetByModuleName
  , rootIdentifierSetInModuleGetDuplicateIndexSet
  ) where

import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.UInt as UInt
import TypeScript.Identifier as Identifier
import TypeScript.ModuleName as ModuleName

newtype RootIdentifierSetInModule
  = RootIdentifierSetInModule
  { rootTypeNameSet :: Map.Map Identifier.TsIdentifier Boolean -- 公開しているかどうか
  , rootVariableNameSet :: Map.Map Identifier.TsIdentifier Boolean -- 公開しているかどうか
  , {- 名前が重複しているもののインデックス -} duplicateIndexSet :: Set.Set UInt.UInt
  }

data TypeOrVariable
  = Type
  | Variable

emptyRootIdentifierSetInModule :: RootIdentifierSetInModule
emptyRootIdentifierSetInModule =
  RootIdentifierSetInModule
    { rootTypeNameSet: Map.empty
    , rootVariableNameSet: Map.empty
    , duplicateIndexSet: Set.empty
    }

rootIdentifierSetInModuleGetDuplicateIndexSet :: RootIdentifierSetInModule -> Set.Set UInt.UInt
rootIdentifierSetInModuleGetDuplicateIndexSet (RootIdentifierSetInModule { duplicateIndexSet }) = duplicateIndexSet

insertTypeOrVariableDeclaration ::
  { typeOrVariable :: TypeOrVariable
  , name :: Identifier.TsIdentifier
  , export :: Boolean
  , index :: UInt.UInt
  } ->
  RootIdentifierSetInModule -> RootIdentifierSetInModule
insertTypeOrVariableDeclaration option (RootIdentifierSetInModule rec) =
  let
    { map, duplicate } =
      insertExportMap
        { name: option.name
        , export: option.export
        , map:
            case option.typeOrVariable of
              Type -> rec.rootTypeNameSet
              Variable -> rec.rootVariableNameSet
        }
  in
    RootIdentifierSetInModule
      { rootTypeNameSet:
          case option.typeOrVariable of
            Type -> map
            Variable -> rec.rootTypeNameSet
      , rootVariableNameSet:
          case option.typeOrVariable of
            Type -> rec.rootVariableNameSet
            Variable -> map
      , duplicateIndexSet:
          if duplicate then
            Set.insert option.index rec.duplicateIndexSet
          else
            rec.duplicateIndexSet
      }

insertExportMap ::
  { name :: Identifier.TsIdentifier
  , export :: Boolean
  , map :: Map.Map Identifier.TsIdentifier Boolean
  } ->
  { map :: Map.Map Identifier.TsIdentifier Boolean, duplicate :: Boolean }
insertExportMap { name, export, map } =
  let
    oldValueMaybe = Map.lookup name map
  in
    case oldValueMaybe of
      Just oldValue ->
        { map:
            if oldValue then
              map
            else
              Map.insert name true map
        , duplicate: true
        }
      Nothing ->
        { map: Map.insert name export map
        , duplicate: false
        }

insertVariableName ::
  { variableName :: Identifier.TsIdentifier
  , export :: Boolean
  , index :: UInt.UInt
  } ->
  RootIdentifierSetInModule -> RootIdentifierSetInModule
insertVariableName option (RootIdentifierSetInModule rec) =
  let
    oldValueMaybe = Map.lookup option.variableName rec.rootTypeNameSet
  in
    RootIdentifierSetInModule
      { rootTypeNameSet: rec.rootTypeNameSet
      , rootVariableNameSet:
          case oldValueMaybe of
            Just true -> rec.rootTypeNameSet
            Just false ->
              if option.export then
                Map.insert option.variableName true rec.rootVariableNameSet
              else
                rec.rootVariableNameSet
            Nothing -> Map.insert option.variableName option.export rec.rootVariableNameSet
      , duplicateIndexSet:
          case oldValueMaybe of
            Just _ -> Set.insert option.index rec.duplicateIndexSet
            Nothing -> rec.duplicateIndexSet
      }

memberTypeNameExported ::
  Identifier.TsIdentifier ->
  RootIdentifierSetInModule ->
  Boolean
memberTypeNameExported typeName (RootIdentifierSetInModule { rootTypeNameSet }) = case Map.lookup typeName rootTypeNameSet of
  Just true -> true
  _ -> false

memberVariableNameExported ::
  Identifier.TsIdentifier ->
  RootIdentifierSetInModule ->
  Boolean
memberVariableNameExported variableName (RootIdentifierSetInModule { rootVariableNameSet }) = case Map.lookup variableName rootVariableNameSet of
  Just true -> true
  _ -> false

type ContextInModuleRecord :: Row Type
type ContextInModuleRecord
  = ( moduleName :: ModuleName.ModuleName
    , rootIdentifierMap :: Map.Map ModuleName.ModuleName RootIdentifierSetInModule
    )

newtype ContextInModule
  = ContextInModule (Record ContextInModuleRecord)

createContextInModule :: Record ContextInModuleRecord -> ContextInModule
createContextInModule = ContextInModule -- TODO ここでルートにある変数の設定をする

newtype ContextInExpr
  = ContextInExpr
  { index :: UInt.UInt
  , variableNameSetList :: Array (Set.Set Identifier.TsIdentifier)
  , typeNameSetList :: Array (Set.Set Identifier.TsIdentifier)
  | ContextInModuleRecord
  }

contextInModuleToContextExpr :: UInt.UInt -> ContextInModule -> ContextInExpr
contextInModuleToContextExpr index (ContextInModule rec) =
  let
    { variableNameSet, typeNameSet } =
      rootIdentifierMapGetRootNameSet
        (rootIdentifierMapGetByModuleName rec.moduleName rec.rootIdentifierMap)
  in
    ContextInExpr
      { variableNameSetList: [ variableNameSet ]
      , typeNameSetList: [ typeNameSet ]
      , index
      , moduleName: rec.moduleName
      , rootIdentifierMap: rec.rootIdentifierMap
      }

rootIdentifierMapGetByModuleName ::
  ModuleName.ModuleName ->
  Map.Map ModuleName.ModuleName RootIdentifierSetInModule ->
  RootIdentifierSetInModule
rootIdentifierMapGetByModuleName moduleName rootIdentifierMap = case Map.lookup moduleName rootIdentifierMap of
  Just rootIdentifierSetInModule -> rootIdentifierSetInModule
  Nothing -> emptyRootIdentifierSetInModule

rootIdentifierMapGetRootNameSet ::
  RootIdentifierSetInModule ->
  { variableNameSet :: Set.Set Identifier.TsIdentifier
  , typeNameSet :: Set.Set Identifier.TsIdentifier
  }
rootIdentifierMapGetRootNameSet (RootIdentifierSetInModule rec) =
  { variableNameSet: Map.keys rec.rootVariableNameSet
  , typeNameSet: Map.keys rec.rootTypeNameSet
  }

memberTypeNameImported ::
  ModuleName.ModuleName -> Identifier.TsIdentifier -> ContextInExpr -> Boolean
memberTypeNameImported moduleName typeName (ContextInExpr { rootIdentifierMap }) =
  memberTypeNameExported
    typeName
    (rootIdentifierMapGetByModuleName moduleName rootIdentifierMap)

memberTypeNameContextInExpr :: Identifier.TsIdentifier -> ContextInExpr -> Boolean
memberTypeNameContextInExpr typeName (ContextInExpr { typeNameSetList }) = Array.any (Set.member typeName) typeNameSetList

memberVariableNameImported :: ModuleName.ModuleName -> Identifier.TsIdentifier -> ContextInExpr -> Boolean
memberVariableNameImported moduleName variableName (ContextInExpr { rootIdentifierMap }) =
  memberVariableNameExported
    variableName
    (rootIdentifierMapGetByModuleName moduleName rootIdentifierMap)

memberVariableNameContextInExpr :: Identifier.TsIdentifier -> ContextInExpr -> Boolean
memberVariableNameContextInExpr variableName (ContextInExpr { variableNameSetList }) = Array.any (Set.member variableName) variableNameSetList

getTypeParameterSetList :: ContextInExpr -> Array (Set.Set Identifier.TsIdentifier)
getTypeParameterSetList (ContextInExpr { typeNameSetList }) = typeNameSetList

getLocalVariableNameSetList :: ContextInExpr -> Array (Set.Set Identifier.TsIdentifier)
getLocalVariableNameSetList (ContextInExpr { variableNameSetList }) = variableNameSetList

contextInExprGetIndex :: ContextInExpr -> UInt.UInt
contextInExprGetIndex (ContextInExpr { index }) = index

addLocalVariableNameSet ::
  Set.Set Identifier.TsIdentifier ->
  ContextInExpr ->
  ContextInExpr
addLocalVariableNameSet localVariableNameSet (ContextInExpr rec) =
  ContextInExpr
    ( rec
        { variableNameSetList =
          Array.snoc rec.variableNameSetList localVariableNameSet
        }
    )

addTypeParameter :: Set.Set Identifier.TsIdentifier -> ContextInExpr -> ContextInExpr
addTypeParameter identifierSet (ContextInExpr rec) =
  ContextInExpr
    ( rec
        { typeNameSetList = Array.snoc rec.typeNameSetList identifierSet }
    )
