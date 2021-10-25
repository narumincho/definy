module CreativeRecord.Build (build) where

import Prelude
import Data.Argonaut.Core as ArgonautCore
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either as Either
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Effect as Effect
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Console as Console
import EsBuild as EsBuild
import FileSystem.Path as Path
import FileSystem.Read as FileSystemRead
import FileSystem.Write as FileSystemWrite
import FileType as FileType
import Firebase.FirebaseJson as FirebaesJson
import Firebase.FirebaseJson as FirebaseJson
import Firebase.SecurityRules as SecurityRules
import Hash as Hash
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import PackageJson as PackageJson
import Prelude as Prelude
import PureScript.Data as PureScriptData
import PureScript.Wellknown as PureScriptWellknown
import Shell as Shell
import StaticResourceFile as StaticResourceFile
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Util as Util

appName :: NonEmptyString.NonEmptyString
appName = NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "creative-record")

firstClientProgramFilePath :: Path.DistributionFilePath
firstClientProgramFilePath =
  Path.DistributionFilePath
    { directoryPath:
        Path.DistributionDirectoryPath
          { appName
          , folderNameMaybe:
              Maybe.Just
                ( NonEmptyString.nes
                    (Proxy.Proxy :: Proxy.Proxy "client-spago-result")
                )
          }
    , fileName: programFileName
    }

programFileName :: NonEmptyString.NonEmptyString
programFileName = NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "program")

esbuildClientProgramFileDirectoryPath :: Path.DistributionDirectoryPath
esbuildClientProgramFileDirectoryPath =
  Path.DistributionDirectoryPath
    { appName
    , folderNameMaybe:
        Maybe.Just
          ( NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "client-esbuild-result")
          )
    }

hostingDirectoryPath :: Path.DistributionDirectoryPath
hostingDirectoryPath =
  Path.DistributionDirectoryPath
    { appName
    , folderNameMaybe:
        Maybe.Just
          ( NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "hosting")
          )
    }

functionsDirectoryPath :: Path.DistributionDirectoryPath
functionsDirectoryPath =
  Path.DistributionDirectoryPath
    { appName
    , folderNameMaybe:
        Maybe.Just
          ( NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "functions")
          )
    }

hostingPortNumber :: UInt.UInt
hostingPortNumber = UInt.fromInt 1324

build :: Aff.Aff Unit
build = do
  Util.toParallel
    [ originCodeGen
    , staticResourceCodeGen
    , writeFirestoreRules
    , writeCloudStorageRules
    , clientProgramAndFirebaseJsonBuild
    , runSpagoForFunctions
    , writePackageJsonForFunctions
    ]

clientProgramAndFirebaseJsonBuild :: Aff.Aff Unit
clientProgramAndFirebaseJsonBuild = do
  runSpagoBundleAppAndLog
  runEsbuild
  fileHashValue <- readEsbuildResultClientProgramFile
  writeCodeClientProgramHashValue fileHashValue
  writeFirebaseJson fileHashValue
  EffectClass.liftEffect (Console.log "クライアント向けビルド完了!")

runSpagoBundleAppAndLog :: Aff.Aff Unit
runSpagoBundleAppAndLog = do
  Aff.makeAff
    ( \callback ->
        map (\_ -> Aff.nonCanceler)
          ( Shell.exec
              ( NonEmptyString.prependString
                  "spago bundle-app --main CreativeRecord.Client --to "
                  (Path.distributionFilePathToString firstClientProgramFilePath FileType.JavaScript)
              )
              ( \result -> do
                  log <- execResultToString result
                  Console.log log
                  callback (Either.Right unit)
              )
          )
    )
  EffectClass.liftEffect (Console.log "spago でのビルドに成功!")

execResultToString :: Shell.ExecResult -> Effect.Effect String
execResultToString result = do
  stdout <- Buffer.toString Encoding.UTF8 result.stdout
  stderr <- Buffer.toString Encoding.UTF8 result.stderr
  pure
    ( String.joinWith "\n"
        [ "stdout:"
        , stdout
        , "stderr:"
        , stderr
        , "error:"
        , show result.error
        ]
    )

runEsbuild :: Aff.Aff Unit
runEsbuild = do
  EsBuild.buildJs
    { entryPoints: firstClientProgramFilePath
    , outdir: esbuildClientProgramFileDirectoryPath
    , sourcemap: false
    , target: [ "chrome94", "firefox93", "safari15" ]
    }
  EffectClass.liftEffect (Console.log "esbuild でのビルドに成功!")

readEsbuildResultClientProgramFile :: Aff.Aff NonEmptyString.NonEmptyString
readEsbuildResultClientProgramFile = do
  clientProgramAsString <-
    FileSystemRead.readTextFileInDistribution
      ( Path.DistributionFilePath
          { directoryPath: esbuildClientProgramFileDirectoryPath
          , fileName: programFileName
          }
      )
      FileType.JavaScript
  let
    clientProgramHashValue = Hash.stringToSha256HashValue clientProgramAsString
  FileSystemWrite.writeTextFileInDistribution
    ( Path.DistributionFilePath
        { directoryPath: hostingDirectoryPath
        , fileName: clientProgramHashValue
        }
    )
    clientProgramAsString
  pure clientProgramHashValue

writeCodeClientProgramHashValue :: NonEmptyString.NonEmptyString -> Aff.Aff Unit
writeCodeClientProgramHashValue fileHashValue =
  FileSystemWrite.writePureScript
    srcDirectoryPath
    ( PureScriptData.Module
        { name:
            PureScriptData.ModuleName
              ( NonEmptyArray.cons' creativeRecordModuleName
                  [ NonEmptyString.nes
                      (Proxy.Proxy :: Proxy.Proxy "ClientProgramHashValue")
                  ]
              )
        , definitionList:
            [ PureScriptData.Definition
                { name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "clientProgramHashValue")
                , document: "クライアント向け JavaScript のファイルのハッシュ値"
                , pType: PureScriptWellknown.nonEmptyString
                , expr: PureScriptWellknown.nonEmptyStringLiteral fileHashValue
                , isExport: true
                }
            ]
        }
    )

writeFirestoreRules :: Aff.Aff Unit
writeFirestoreRules =
  FileSystemWrite.writeFirebaseRules
    firestoreSecurityRulesFilePath
    SecurityRules.allForbiddenFirestoreRule

writeCloudStorageRules :: Aff.Aff Unit
writeCloudStorageRules =
  FileSystemWrite.writeFirebaseRules
    cloudStorageSecurityRulesFilePath
    SecurityRules.allForbiddenFirebaseStorageRule

firestoreSecurityRulesFilePath :: Path.DistributionFilePath
firestoreSecurityRulesFilePath =
  Path.DistributionFilePath
    { directoryPath: Path.DistributionDirectoryPath { appName, folderNameMaybe: Maybe.Nothing }
    , fileName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "firestore")
    }

cloudStorageSecurityRulesFilePath :: Path.DistributionFilePath
cloudStorageSecurityRulesFilePath =
  Path.DistributionFilePath
    { directoryPath:
        Path.DistributionDirectoryPath { appName, folderNameMaybe: Maybe.Nothing }
    , fileName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "storage")
    }

writeFirebaseJson :: NonEmptyString.NonEmptyString -> Aff.Aff Unit
writeFirebaseJson clientProgramHashValue = do
  FileSystemWrite.writeJson
    ( Path.DistributionFilePath
        { directoryPath: Path.DistributionDirectoryPath { appName, folderNameMaybe: Maybe.Nothing }
        , fileName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "firebase")
        }
    )
    ( FirebaseJson.toJson
        ( FirebaseJson.FirebaseJson
            { cloudStorageRulesFilePath: cloudStorageSecurityRulesFilePath
            , emulators:
                FirebaseJson.Emulators
                  { firestorePortNumber: Maybe.Just (UInt.fromInt 8080)
                  , hostingPortNumber: Maybe.Just hostingPortNumber
                  , storagePortNumber: Maybe.Just (UInt.fromInt 9199)
                  }
            , firestoreRulesFilePath: firestoreSecurityRulesFilePath
            , functions: Maybe.Nothing
            , hostingDistributionPath: hostingDirectoryPath
            , hostingRewites:
                [ FirebaseJson.Rewrite
                    { source: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "**")
                    , function: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "html")
                    }
                ]
            , hostingHeaders:
                [ FirebaesJson.SourceAndHeaders
                    { source: clientProgramHashValue
                    , headers:
                        [ FirebaseJson.Header
                            { key: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "content-type")
                            , value: NonEmptyString.toString FileType.javaScriptMimeType
                            }
                        ]
                    }
                ]
            }
        )
    )
  EffectClass.liftEffect (Console.log "firebase.json の書き込みに成功!")

originCodeGen :: Aff.Aff Prelude.Unit
originCodeGen = FileSystemWrite.writePureScript srcDirectoryPath originPureScriptModule

staticResourceCodeGen :: Aff.Aff Prelude.Unit
staticResourceCodeGen =
  Prelude.bind
    ( StaticResourceFile.getStaticResourceFileResult
        ( Path.DirectoryPath
            [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "narumincho-creative-record")
            , NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "resource")
            ]
        )
    )
    ( \resultList ->
        FileSystemWrite.writePureScript
          srcDirectoryPath
          (staticFileResultToPureScriptModule resultList)
    )

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
          , NonEmptyString.toString (Path.filePathToString record.originalFilePath)
          , "\"をリクエストするためのURL. ファイルのハッシュ値は "
          , NonEmptyString.toString record.requestPathAndUploadFileName
          , "\"(コード生成結果)"
          ]
    , pType:
        PureScriptData.PType
          { moduleName:
              PureScriptData.ModuleName
                ( NonEmptyArray.singleton
                    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "StructuredUrl"))
                )
          , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "PathAndSearchParams")
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
                    [ PureScriptData.StringLiteral
                        (NonEmptyString.toString record.requestPathAndUploadFileName)
                    ]
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

srcDirectoryPath :: Path.DirectoryPath
srcDirectoryPath =
  Path.DirectoryPath
    [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "src") ]

originPureScriptModule :: PureScriptData.Module
originPureScriptModule =
  PureScriptData.Module
    { name: originModuleName
    , definitionList:
        [ PureScriptData.Definition
            { name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "origin")
            , document: "アプリケーションのオリジン (コード生成結果)"
            , pType: PureScriptWellknown.nonEmptyString
            , expr:
                PureScriptWellknown.nonEmptyStringLiteral
                  ( NonEmptyString.appendString
                      (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "http://localhost:"))
                      (UInt.toString hostingPortNumber)
                  )
            , isExport: true
            }
        ]
    }

runSpagoForFunctions :: Aff.Aff Unit
runSpagoForFunctions = do
  Aff.makeAff
    ( \callback ->
        map (\_ -> Aff.nonCanceler)
          ( Shell.exec
              ( Prelude.append
                  ( NonEmptyString.nes
                      (Proxy.Proxy :: Proxy.Proxy "spago bundle-module --main CreativeRecord.Functions --to ")
                  )
                  ( Path.distributionFilePathToString
                      ( Path.DistributionFilePath
                          { directoryPath: functionsDirectoryPath
                          , fileName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "index")
                          }
                      )
                      FileType.JavaScript
                  )
              )
              ( \result -> do
                  log <- execResultToString result
                  Console.log log
                  callback (Either.Right unit)
              )
          )
    )
  EffectClass.liftEffect (Console.log "spago で functions のビルドに成功!")

writePackageJsonForFunctions :: Aff.Aff Unit
writePackageJsonForFunctions = case packageJsonForFunctions of
  Maybe.Just json ->
    FileSystemWrite.writeJson
      ( Path.DistributionFilePath
          { directoryPath: functionsDirectoryPath
          , fileName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "package")
          }
      )
      json
  Maybe.Nothing -> EffectClass.liftEffect (Console.log "functions 向けの package.json の生成に失敗した")

packageJsonForFunctions :: Maybe.Maybe ArgonautCore.Json
packageJsonForFunctions =
  Prelude.map
    ( \name ->
        PackageJson.toJson
          ( PackageJson.PackageJsonInput
              { name
              , version: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "0.0.0")
              , description: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ナルミンチョの創作記録 https://narumincho.com")
              , gitHubAccountName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "narumincho")
              , gitHubRepositoryName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "definy")
              , entryPoint: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "./index.js")
              , homepage:
                  StructuredUrl.StructuredUrl
                    { origin: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://narumincho.com")
                    , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] Map.empty
                    }
              , author:
                  NonEmptyString.nes
                    ( Proxy.Proxy ::
                        Proxy.Proxy
                          "narumincho <narumincho.starfy@gmail.com> (https://narumincho.com)"
                    )
              , nodeVersion: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "14")
              , dependencies:
                  Map.fromFoldable
                    [ Tuple.Tuple
                        (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "firebase-admin"))
                        (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "10.0.0"))
                    , Tuple.Tuple
                        (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "firebase-functions"))
                        (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "3.15.7"))
                    ]
              , typeFilePath: Maybe.Nothing
              }
          )
    )
    (PackageJson.nameFromNonEmptyString appName)
