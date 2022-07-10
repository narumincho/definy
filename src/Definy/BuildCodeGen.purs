module Definy.BuildCodeGen
  ( outputNowModeAndOrigin
  , writeClientScriptHashTs
  , writeOutTs
  ) where

import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Definy.ModuleName as ModuleName
import Definy.Version as Version
import Effect.Aff as Aff
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Write as FileSystemWrite
import Hash as Hash
import Prelude as Prelude
import PureScript.Data as PureScriptData
import PureScript.Wellknown as PureScriptWellknown
import Type.Proxy (Proxy(..))
import TypeScript.Data as Data
import TypeScript.Data as TypeScriptData
import TypeScript.Identifier as Identifier
import TypeScript.ModuleName as TsModuleName
import TypeScript.ToString as ToString
import Util as Util

outputNowModeAndOrigin ::
  NonEmptyString ->
  Version.Version ->
  Aff.Aff Prelude.Unit
outputNowModeAndOrigin origin version =
  Util.toParallel
    [ FileSystemWrite.writePureScript
        (generateNowModeAndOriginPureScriptModule origin version)
    , writeOutTs origin version
    ]

generateNowModeAndOriginPureScriptModule ::
  NonEmptyString ->
  Version.Version ->
  PureScriptData.Module
generateNowModeAndOriginPureScriptModule origin version =
  PureScriptData.Module
    { name: ModuleName.originAndVersion
    , definitionList:
        [ PureScriptWellknown.definition
            { name: NonEmptyString.nes (Proxy :: _ "nowMode")
            , document: "実行モード (ビルド時にコード生成される)"
            , pType:
                PureScriptWellknown.pTypeFrom
                  { moduleName: ModuleName.productionOrDevelopment
                  , name: NonEmptyString.nes (Proxy :: _ "ProductionOrDevelopment")
                  }
            , expr:
                case version of
                  Version.Development _ ->
                    PureScriptWellknown.tag
                      { moduleName: ModuleName.productionOrDevelopment
                      , name: NonEmptyString.nes (Proxy :: _ "Development")
                      }
                  Version.Production _ ->
                    PureScriptWellknown.tag
                      { moduleName: ModuleName.productionOrDevelopment
                      , name: NonEmptyString.nes (Proxy :: _ "Production")
                      }
            , isExport: true
            }
        , PureScriptWellknown.definition
            { name: NonEmptyString.nes (Proxy :: _ "origin")
            , document: "オリジン (ビルド時にコード生成される)"
            , pType: PureScriptWellknown.nonEmptyString
            , expr: PureScriptWellknown.nonEmptyStringLiteral origin
            , isExport: true
            }
        , createVersionDefinition version
        ]
    }

createVersionDefinition ::
  Version.Version ->
  PureScriptData.Definition
createVersionDefinition version =
  PureScriptWellknown.definition
    { name: NonEmptyString.nes (Proxy :: _ "version")
    , document: Prelude.append "バージョン名 (ビルド時にコード生成される) " (Version.toSimpleString version)
    , pType: Version.versionType
    , expr:
        Version.toExpr version
    , isExport: true
    }

outTsPath :: Path.FilePath
outTsPath =
  Path.FilePath
    { directoryPath: Path.DirectoryPath []
    , fileName:
        Name.fromSymbolProxy (Proxy :: Proxy "out")
    }

writeOutTs :: NonEmptyString -> Version.Version -> Aff.Aff Prelude.Unit
writeOutTs origin version =
  FileSystemWrite.writeTypeScriptFile
    ( ToString.typeScriptModuleMapToString
        ( Data.TypeScriptModuleMap
            ( Map.fromFoldable
                [ Tuple.Tuple
                    (TsModuleName.Local outTsPath)
                    (createOutTs origin version)
                ]
            )
        )
        true
    )

createOutTs :: NonEmptyString -> Version.Version -> TypeScriptData.Module
createOutTs origin version =
  TypeScriptData.Module
    { moduleDocument: "definy.app のビルド情報などが書かれたモジュール"
    , exportDefinitionList:
        [ Data.ExportDefinitionVariable
            ( Data.VariableDeclaration
                { name: Identifier.fromSymbolProxyUnsafe (Proxy :: _ "nowMode")
                , document: "実行モード (ビルド時にコード生成される)"
                , type:
                    Data.TsTypeUnion
                      ( NonEmptyArray.cons'
                          (Data.TsTypeStringLiteral "Develop")
                          [ Data.TsTypeStringLiteral "Release" ]
                      )
                , expr:
                    Data.StringLiteral
                      ( case version of
                          Version.Production _ -> "Release"
                          Version.Development _ -> "Develop"
                      )
                , export: true
                }
            )
        , Data.ExportDefinitionVariable
            ( Data.VariableDeclaration
                { name: Identifier.fromSymbolProxyUnsafe (Proxy :: _ "origin")
                , document: "オリジン (ビルド時にコード生成される)"
                , type: Data.TsTypeString
                , expr: Data.StringLiteral (NonEmptyString.toString origin)
                , export: true
                }
            )
        , Data.ExportDefinitionVariable
            ( Data.VariableDeclaration
                { name: Identifier.fromSymbolProxyUnsafe (Proxy :: _ "version")
                , document: "バージョン名"
                , type: Data.TsTypeString
                , expr: Data.StringLiteral (Version.toSimpleString version)
                , export: true
                }
            )
        , Data.ExportDefinitionVariable
            ( Data.VariableDeclaration
                { name: Identifier.fromSymbolProxyUnsafe (Proxy :: _ "commitUrl")
                , document: "このサーバーのコードのスナップショット"
                , type: Data.TsTypeString
                , expr:
                    Data.StringLiteral
                      ( Prelude.append "https://github.com/narumincho/definy"
                          ( case version of
                              Version.Development _ -> ""
                              Version.Production hash -> Prelude.append "/tree/" (NonEmptyString.toString hash)
                          )
                      )
                , export: true
                }
            )
        ]
    }

clientScriptHashTsPath :: Path.FilePath
clientScriptHashTsPath =
  Path.FilePath
    { directoryPath: Path.DirectoryPath []
    , fileName:
        Name.fromSymbolProxy (Proxy :: Proxy "clientScriptHash")
    }

writeClientScriptHashTs :: Hash.Sha256HashValue -> Aff.Aff Prelude.Unit
writeClientScriptHashTs clientScriptHash =
  FileSystemWrite.writeTypeScriptFile
    ( ToString.typeScriptModuleMapToString
        ( Data.TypeScriptModuleMap
            ( Map.fromFoldable
                [ Tuple.Tuple
                    (TsModuleName.Local clientScriptHashTsPath)
                    (createClientScriptHashTs clientScriptHash)
                ]
            )
        )
        true
    )

createClientScriptHashTs :: Hash.Sha256HashValue -> TypeScriptData.Module
createClientScriptHashTs clientScriptHash =
  TypeScriptData.Module
    { moduleDocument: ""
    , exportDefinitionList:
        [ Data.ExportDefinitionVariable
            ( Data.VariableDeclaration
                { name: Identifier.fromSymbolProxyUnsafe (Proxy :: _ "clientScriptPath")
                , document: "クライアントのスクリプトのパス"
                , type: Data.TsTypeString
                , expr:
                    Data.StringLiteral
                      (NonEmptyString.toString (Hash.toNonEmptyString clientScriptHash))
                , export: true
                }
            )
        ]
    }
