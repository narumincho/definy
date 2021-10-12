module CreativeRecord.CodeGen where

import Data.Maybe as Maybe
import Effect.Aff as Aff
import FileSystem as FileSystem
import Prelude as Prelude
import PureScript as PureScript
import StaticResourceFile as StaticResourceFile

codeGen :: Aff.Aff Prelude.Unit
codeGen =
  Prelude.bind
    ( StaticResourceFile.getStaticResourceFileResult
        (FileSystem.DirectoryPath [ "narumincho-creative-record", "resource" ])
    )
    (\resultList -> FileSystem.writePureScript (FileSystem.DirectoryPath [ "src" ]) "Out" (staticFileResultToPureScriptModule resultList))

staticFileResultToPureScriptModule :: Array StaticResourceFile.StaticResourceFileResult -> PureScript.Module
staticFileResultToPureScriptModule _resultList =
  PureScript.Module
    { name: PureScript.ModuleName [ "Out" ]
    , definitionList:
        [ PureScript.Definition
            { name: "origin"
            , document: "アプリケーションのオリジン (コード生成結果)"
            , pType: PureScript.PType { moduleName: PureScript.ModuleName [ "Prim" ], name: "String", argument: Maybe.Nothing }
            , expr: PureScript.StringLiteral "http://localhost:1234"
            , isExport: true
            }
        ]
    }
