module CreativeRecord.CodeGen where

import Control.Parallel.Class as ParallelClass
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe as Maybe
import Data.String as String
import Effect.Aff as Aff
import FileSystem as FileSystem
import Prelude as Prelude
import PureScript as PureScript
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

staticFileResultToPureScriptModule :: Array StaticResourceFile.StaticResourceFileResult -> PureScript.Module
staticFileResultToPureScriptModule resultList =
  PureScript.Module
    { name: PureScript.ModuleName (NonEmptyArray.cons' creativeRecordModuleName [ staticResourceModuleName ])
    , definitionList:
        Prelude.map
          staticResourceFileResultToPureScriptDefinition
          resultList
    }

staticResourceFileResultToPureScriptDefinition :: StaticResourceFile.StaticResourceFileResult -> PureScript.Definition
staticResourceFileResultToPureScriptDefinition (StaticResourceFile.StaticResourceFileResult record) =
  PureScript.Definition
    { name: record.fileId
    , document:
        String.joinWith ""
          [ "static な ファイル の \""
          , FileSystem.filePathToString record.originalFilePath
          , "\"をリクエストするためのURL. ファイルのハッシュ値は "
          , record.uploadFileName
          , "\"(コード生成結果)"
          ]
    , pType: PureScript.PType { moduleName: PureScript.primModuleName, name: "String", argument: Maybe.Nothing }
    , expr: PureScript.StringLiteral record.uploadFileName
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

originPureScriptModule :: PureScript.Module
originPureScriptModule =
  PureScript.Module
    { name:
        PureScript.ModuleName
          (NonEmptyArray.cons' creativeRecordModuleName [ originModuleName ])
    , definitionList:
        [ PureScript.Definition
            { name: "origin"
            , document: "アプリケーションのオリジン (コード生成結果)"
            , pType: PureScript.PType { moduleName: PureScript.primModuleName, name: "String", argument: Maybe.Nothing }
            , expr: PureScript.StringLiteral "http://localhost:1234"
            , isExport: true
            }
        ]
    }
