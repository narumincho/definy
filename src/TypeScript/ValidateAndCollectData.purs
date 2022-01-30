module TypeScript.ValidateAndCollectData
  ( ContextInExportDefinition
  , ContextInExpr
  , ContextInModule
  , RootIdentifierSetInModule
  , addLocalVariableNameSet
  , addTypeParameter
  , contextExportDefinitionToContextInExpr
  , contextInExportDefinitionGetIndex
  , contextInExprGetIndex
  , contextInModuleToContextExportDefinition
  , createContextInModule
  , emptyRootIdentifierSetInModule
  , getLocalVariableNameSetList
  , getTypeParameterSetList
  , insertTypeName
  , insertVariableName
  , memberTypeName
  , memberTypeNameContextInExpr
  , memberTypeNameImported
  , memberVariableName
  , memberVariableNameContextInExpr
  , memberVariableNameImported
  ) where

import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.UInt as UInt
import Record as Record
import Type.Proxy (Proxy(..))
import TypeScript.Identifier as Identifier
import TypeScript.ModuleName as ModuleName

newtype RootIdentifierSetInModule
  = RootIdentifierSetInModule
  { rootTypeNameSet :: Set.Set Identifier.TsIdentifier
  , rootVariableNameSet :: Set.Set Identifier.TsIdentifier
  }

emptyRootIdentifierSetInModule :: RootIdentifierSetInModule
emptyRootIdentifierSetInModule =
  RootIdentifierSetInModule
    { rootTypeNameSet: Set.empty, rootVariableNameSet: Set.empty }

insertTypeName :: Identifier.TsIdentifier -> RootIdentifierSetInModule -> RootIdentifierSetInModule
insertTypeName typeName (RootIdentifierSetInModule rec) =
  RootIdentifierSetInModule
    (Record.modify (Proxy :: _ "rootTypeNameSet") (Set.insert typeName) rec)

insertVariableName :: Identifier.TsIdentifier -> RootIdentifierSetInModule -> RootIdentifierSetInModule
insertVariableName variableName (RootIdentifierSetInModule rec) =
  RootIdentifierSetInModule
    (Record.modify (Proxy :: _ "rootVariableNameSet") (Set.insert variableName) rec)

memberTypeName ::
  Identifier.TsIdentifier ->
  RootIdentifierSetInModule ->
  Boolean
memberTypeName typeName (RootIdentifierSetInModule { rootTypeNameSet }) =
  Set.member
    typeName
    rootTypeNameSet

memberVariableName ::
  Identifier.TsIdentifier ->
  RootIdentifierSetInModule ->
  Boolean
memberVariableName variableName (RootIdentifierSetInModule { rootVariableNameSet }) =
  Set.member
    variableName
    rootVariableNameSet

type ContextInModuleRecord :: Row Type
type ContextInModuleRecord
  = ( moduleName :: ModuleName.ModuleName
    , rootIdentifierMap :: Map.Map ModuleName.ModuleName RootIdentifierSetInModule
    )

newtype ContextInModule
  = ContextInModule (Record ContextInModuleRecord)

createContextInModule :: Record ContextInModuleRecord -> ContextInModule
createContextInModule = ContextInModule

type ContextInExportDefinitionRecord :: Row Type
type ContextInExportDefinitionRecord
  = ( index :: UInt.UInt | ContextInModuleRecord )

newtype ContextInExportDefinition
  = ContextInExportDefinition (Record ContextInExportDefinitionRecord)

contextInExportDefinitionGetIndex :: ContextInExportDefinition -> UInt.UInt
contextInExportDefinitionGetIndex (ContextInExportDefinition { index }) = index

newtype ContextInExpr
  = ContextInExpr
  { localVariableNameSetList :: Array (Set.Set Identifier.TsIdentifier)
  , typeParameterSetList :: Array (Set.Set Identifier.TsIdentifier)
  | ContextInExportDefinitionRecord
  }

contextInModuleToContextExportDefinition :: UInt.UInt -> ContextInModule -> ContextInExportDefinition
contextInModuleToContextExportDefinition index (ContextInModule rec) =
  ContextInExportDefinition
    (Record.insert (Proxy :: _ "index") index rec)

contextExportDefinitionToContextInExpr :: Set.Set Identifier.TsIdentifier -> ContextInExportDefinition -> ContextInExpr
contextExportDefinitionToContextInExpr typeParameterSet (ContextInExportDefinition rec) =
  ContextInExpr
    ( Record.insert
        (Proxy :: _ "localVariableNameSetList")
        []
        (Record.insert (Proxy :: _ "typeParameterSetList") [ typeParameterSet ] rec)
    )

memberTypeNameImported :: ModuleName.ModuleName -> Identifier.TsIdentifier -> ContextInExpr -> Boolean
memberTypeNameImported moduleName typeName context =
  memberTypeNameContextInExpr
    typeName
    (setModuleName moduleName context)

memberTypeNameContextInExpr :: Identifier.TsIdentifier -> ContextInExpr -> Boolean
memberTypeNameContextInExpr typeName context@(ContextInExpr { typeParameterSetList }) =
  if memberTypeNameContextInExprInRoot typeName context then
    true
  else
    Array.any (Set.member typeName) typeParameterSetList

memberTypeNameContextInExprInRoot :: Identifier.TsIdentifier -> ContextInExpr -> Boolean
memberTypeNameContextInExprInRoot typeName (ContextInExpr { moduleName, rootIdentifierMap }) = case Map.lookup moduleName rootIdentifierMap of
  Just rootIdentifierSet -> memberTypeName typeName rootIdentifierSet
  Nothing -> false

memberVariableNameImported :: ModuleName.ModuleName -> Identifier.TsIdentifier -> ContextInExpr -> Boolean
memberVariableNameImported moduleName variableName context =
  memberVariableNameContextInExpr
    variableName
    (setModuleName moduleName context)

memberVariableNameContextInExpr :: Identifier.TsIdentifier -> ContextInExpr -> Boolean
memberVariableNameContextInExpr variableName context@(ContextInExpr { localVariableNameSetList }) =
  if memberVariableNameContextInExprInRoot variableName context then
    true
  else
    Array.any (Set.member variableName) localVariableNameSetList

memberVariableNameContextInExprInRoot :: Identifier.TsIdentifier -> ContextInExpr -> Boolean
memberVariableNameContextInExprInRoot variableName (ContextInExpr { moduleName, rootIdentifierMap }) = case Map.lookup moduleName rootIdentifierMap of
  Just rootIdentifierSet -> memberVariableName variableName rootIdentifierSet
  Nothing -> false

getTypeParameterSetList :: ContextInExpr -> Array (Set.Set Identifier.TsIdentifier)
getTypeParameterSetList (ContextInExpr { moduleName, rootIdentifierMap, typeParameterSetList }) =
  Array.cons
    ( case Map.lookup moduleName rootIdentifierMap of
        Just (RootIdentifierSetInModule { rootTypeNameSet }) -> rootTypeNameSet
        Nothing -> Set.empty
    )
    typeParameterSetList

getLocalVariableNameSetList :: ContextInExpr -> Array (Set.Set Identifier.TsIdentifier)
getLocalVariableNameSetList (ContextInExpr { moduleName, rootIdentifierMap, localVariableNameSetList }) =
  Array.cons
    ( case Map.lookup moduleName rootIdentifierMap of
        Just (RootIdentifierSetInModule { rootVariableNameSet }) -> rootVariableNameSet
        Nothing -> Set.empty
    )
    localVariableNameSetList

contextInExprGetIndex :: ContextInExpr -> UInt.UInt
contextInExprGetIndex (ContextInExpr { index }) = index

addLocalVariableNameSet ::
  Set.Set Identifier.TsIdentifier ->
  ContextInExpr ->
  ContextInExpr
addLocalVariableNameSet localVariableNameSet (ContextInExpr rec) =
  ContextInExpr
    ( rec
        { localVariableNameSetList =
          Array.snoc rec.localVariableNameSetList localVariableNameSet
        }
    )

addTypeParameter :: Set.Set Identifier.TsIdentifier -> ContextInExpr -> ContextInExpr
addTypeParameter identifierSet (ContextInExpr rec) =
  ContextInExpr
    ( rec
        { typeParameterSetList = Array.snoc rec.typeParameterSetList identifierSet
        }
    )

setModuleName :: ModuleName.ModuleName -> ContextInExpr -> ContextInExpr
setModuleName moduleName (ContextInExpr rec) =
  ContextInExpr
    (rec { moduleName = moduleName })
