module CreativeRecord.CodeGen where

import Control.Parallel.Class as ParallelClass
import Data.Array.NonEmpty as NonEmptyArray
import Data.String as String
import Effect.Aff as Aff
import FileSystem as FileSystem
import Prelude as Prelude
import PureScript.Data as PureScriptData
import PureScript.Wellknown as PureScriptWellknown
import StaticResourceFile as StaticResourceFile

codeGen :: Aff.Aff Prelude.Unit
codeGen =
  ParallelClass.sequential
    ( Prelude.apply
        (Prelude.map (\_ _ -> Prelude.unit) (Aff.parallel originCodeGen))
        (Aff.parallel staticResourceCodeGen)
    )

originCodeGen :: Aff.Aff Prelude.Unit
originCodeGen = FileSystem.writePureScript srcDirectoryPath originPureScriptModule

staticResourceCodeGen :: Aff.Aff Prelude.Unit
staticResourceCodeGen =
  Prelude.bind
    ( StaticResourceFile.getStaticResourceFileResult
        (FileSystem.DirectoryPath [ "narumincho-creative-record", "resource" ])
    )
    (\resultList -> FileSystem.writePureScript srcDirectoryPath (staticFileResultToPureScriptModule resultList))

staticFileResultToPureScriptModule :: Array StaticResourceFile.StaticResourceFileResult -> PureScriptData.Module
staticFileResultToPureScriptModule resultList =
  PureScriptData.Module
    { name: PureScriptData.ModuleName (NonEmptyArray.cons' creativeRecordModuleName [ staticResourceModuleName ])
    , definitionList:
        Prelude.map
          staticResourceFileResultToPureScriptDefinition
          resultList
    }

staticResourceFileResultToPureScriptDefinition :: StaticResourceFile.StaticResourceFileResult -> PureScriptData.Definition
staticResourceFileResultToPureScriptDefinition (StaticResourceFile.StaticResourceFileResult record) =
  PureScriptData.Definition
    { name: record.fileId
    , document:
        String.joinWith ""
          [ "static な ファイル の \""
          , FileSystem.filePathToString record.originalFilePath
          , "\"をリクエストするためのURL. ファイルのハッシュ値は "
          , record.uploadFileName
          , "\"(コード生成結果)"
          ]
    , pType: PureScriptWellknown.primString
    , expr: PureScriptData.StringLiteral record.uploadFileName
    , isExport: true
    }

creativeRecordModuleName :: String
creativeRecordModuleName = "CreativeRecord"

originModuleName :: String
originModuleName = "Origin"

staticResourceModuleName :: String
staticResourceModuleName = "StaticResource"

srcDirectoryPath :: FileSystem.DirectoryPath
srcDirectoryPath = FileSystem.DirectoryPath [ "src" ]

originPureScriptModule :: PureScriptData.Module
originPureScriptModule =
  PureScriptData.Module
    { name:
        PureScriptData.ModuleName
          (NonEmptyArray.cons' creativeRecordModuleName [ originModuleName ])
    , definitionList:
        [ PureScriptData.Definition
            { name: "origin"
            , document: "アプリケーションのオリジン (コード生成結果)"
            , pType: PureScriptWellknown.primString
            , expr: PureScriptData.StringLiteral "http://localhost:1234"
            , isExport: true
            }
        ]
    }
