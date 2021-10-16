module CreativeRecord.CodeGen where

import Control.Parallel.Class as ParallelClass
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import FileSystem as FileSystem
import Prelude as Prelude
import PureScript.Data as PureScriptData
import PureScript.Wellknown as PureScriptWellknown
import StaticResourceFile as StaticResourceFile
import Type.Proxy as Proxy

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
        ( FileSystem.DirectoryPath
            [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "narumincho-creative-record")
            , NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "resource")
            ]
        )
    )
    (\resultList -> FileSystem.writePureScript srcDirectoryPath (staticFileResultToPureScriptModule resultList))

staticFileResultToPureScriptModule :: Array StaticResourceFile.StaticResourceFileResult -> PureScriptData.Module
staticFileResultToPureScriptModule resultList =
  PureScriptData.Module
    { name: staticResourceModuleName
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
          , NonEmptyString.toString (FileSystem.filePathToString record.originalFilePath)
          , "\"をリクエストするためのURL. ファイルのハッシュ値は "
          , record.uploadFileName
          , "\"(コード生成結果)"
          ]
    , pType:
        PureScriptData.PType
          { moduleName: PureScriptData.ModuleName (NonEmptyArray.singleton (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "StructuredUrl")))
          , name: "PathAndSearchParams"
          , argument: Maybe.Nothing
          }
    , expr:
        PureScriptData.Call
          { function:
              PureScriptData.Variable
                { moduleName:
                    PureScriptData.ModuleName
                      ( NonEmptyArray.singleton
                          ( NonEmptyString.nes
                              (Proxy.Proxy :: Proxy.Proxy "StructuredUrl")
                          )
                      )
                , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "pathAndSearchParams")
                }
          , arguments:
              NonEmptyArray.cons
                ( PureScriptData.ArrayLiteral
                    [ PureScriptData.StringLiteral record.uploadFileName ]
                )
                ( NonEmptyArray.singleton PureScriptWellknown.dataMapEmpty
                )
          }
    , isExport: true
    }

creativeRecordModuleName :: NonEmptyString.NonEmptyString
creativeRecordModuleName = NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "CreativeRecord")

originModuleName :: PureScriptData.ModuleName
originModuleName =
  PureScriptData.ModuleName
    ( NonEmptyArray.cons' creativeRecordModuleName
        [ NonEmptyString.nes
            (Proxy.Proxy :: Proxy.Proxy "Origin")
        ]
    )

staticResourceModuleName :: PureScriptData.ModuleName
staticResourceModuleName =
  PureScriptData.ModuleName
    ( NonEmptyArray.cons' creativeRecordModuleName
        [ NonEmptyString.nes
            (Proxy.Proxy :: Proxy.Proxy "StaticResource")
        ]
    )

srcDirectoryPath :: FileSystem.DirectoryPath
srcDirectoryPath =
  FileSystem.DirectoryPath
    [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "src") ]

originPureScriptModule :: PureScriptData.Module
originPureScriptModule =
  PureScriptData.Module
    { name: originModuleName
    , definitionList:
        [ PureScriptData.Definition
            { name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "origin")
            , document: "アプリケーションのオリジン (コード生成結果)"
            , pType: PureScriptWellknown.primString
            , expr: PureScriptData.StringLiteral "http://localhost:1234"
            , isExport: true
            }
        ]
    }
