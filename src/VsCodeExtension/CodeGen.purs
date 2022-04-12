module VsCodeExtension.CodeGen
  ( codeAsBinary
  ) where

import Binary as Binary
import Data.Map as Map
import Data.Maybe (Maybe(..))
import FileSystem.Name as FileSystemName
import FileSystem.Path as FileSystemPath
import Type.Proxy (Proxy(..))
import TypeScript.Data as TsData
import TypeScript.Identifier as TsIdentifier
import TypeScript.ModuleName as TsModuleName
import TypeScript.ToString as TsToString

codeAsBinary :: String -> Binary.Binary
codeAsBinary definyCode = case Map.lookup
    filePath
    ( TsToString.typeScriptModuleMapToString
        (moduleMap definyCode)
    ) of
  Just (TsToString.ModuleResult { code }) -> Binary.fromStringWriteAsUtf8 code
  Nothing -> Binary.fromStringWriteAsUtf8 "output error"

filePath :: FileSystemPath.FilePath
filePath =
  FileSystemPath.FilePath
    { directoryPath: FileSystemPath.DirectoryPath []
    , fileName: FileSystemName.fromSymbolProxy (Proxy :: Proxy "main")
    }

moduleMap :: String -> TsData.TypeScriptModuleMap
moduleMap definyCode =
  TsData.TypeScriptModuleMap
    ( Map.singleton
        ( TsModuleName.Local filePath
        )
        ( TsData.TypeScriptModule
            { exportDefinitionList:
                [ TsData.ExportDefinitionVariable
                    ( TsData.VariableDeclaration
                        { name: TsIdentifier.fromSymbolProxyUnsafe (Proxy :: Proxy "code")
                        , document: "コード"
                        , type: TsData.TsTypeString
                        , expr: TsData.StringLiteral definyCode
                        , export: true
                        }
                    )
                ]
            }
        )
    )
