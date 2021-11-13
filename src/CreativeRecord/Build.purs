module CreativeRecord.Build (main, build) where

import Prelude
import Console as Console
import Data.Argonaut.Core as ArgonautCore
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Effect as Effect
import Effect.Aff as Aff
import EsBuild as EsBuild
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Read as FileSystemRead
import FileSystem.Write as FileSystemWrite
import Firebase.FirebaseJson as FirebaseJson
import Firebase.SecurityRules as SecurityRules
import Hash as Hash
import MediaType as MediaType
import PackageJson as PackageJson
import Prelude as Prelude
import ProductionOrDevelopment as ProductionOrDevelopment
import PureScript.Data as PureScriptData
import PureScript.Spago as Spago
import PureScript.Wellknown as PureScriptWellknown
import StaticResourceFile as StaticResourceFile
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Util as Util

main :: Effect.Effect Unit
main =
  Aff.runAff_ (Console.logValue "build aff result")
    (Aff.attempt (build ProductionOrDevelopment.Production))

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

build :: ProductionOrDevelopment.ProductionOrDevelopment -> Aff.Aff Unit
build productionOrDevelopment = do
  Util.toParallel
    [ writeFirestoreRules
    , writeCloudStorageRules
    , mainBuild productionOrDevelopment
    , writePackageJsonForFunctions
    ]

mainBuild :: ProductionOrDevelopment.ProductionOrDevelopment -> Aff.Aff Unit
mainBuild productionOrDevelopment = do
  (Tuple.Tuple staticFileData _) <- Tuple.Tuple <$> staticResourceBuild <*> (originCodeGen productionOrDevelopment)
  clinetProgramHashValue <- clientProgramBuild
  Util.toParallel
    [ writeCodeClientProgramHashValueAndFunctionBuild clinetProgramHashValue
    , writeFirebaseJson staticFileData clinetProgramHashValue
    ]
  pure unit

writeCodeClientProgramHashValueAndFunctionBuild :: NonEmptyString.NonEmptyString -> Aff.Aff Unit
writeCodeClientProgramHashValueAndFunctionBuild clinetProgramHashValue = do
  writeCodeClientProgramHashValue clinetProgramHashValue
  runSpagoForFunctions

clientProgramBuild :: Aff.Aff NonEmptyString.NonEmptyString
clientProgramBuild = do
  runSpagoBundleAppAndLog
  runEsbuild
  fileHashValue <- readEsbuildResultClientProgramFile
  Console.logValueAsAff "クライアント向けビルド完了!" { fileHashValue }
  pure fileHashValue

runSpagoBundleAppAndLog :: Aff.Aff Unit
runSpagoBundleAppAndLog = do
  Spago.bundleApp
    { mainModuleName:
        PureScriptData.ModuleName
          ( NonEmptyArray.cons'
              (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "CreativeRecord"))
              [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Client") ]
          )
    , outputJavaScriptPath: firstClientProgramFilePath
    }
  Console.logValueAsAff "spago でのビルドに成功!" {}

runEsbuild :: Aff.Aff Unit
runEsbuild = do
  EsBuild.buildJs
    { entryPoints: Path.distributionFilePathToFilePath firstClientProgramFilePath
    , outdir: esbuildClientProgramFileDirectoryPath
    , sourcemap: false
    , target: [ "chrome94", "firefox93", "safari15" ]
    }
  Console.logValueAsAff "esbuild でのビルドに成功!" {}

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
    ( PureScriptData.Module
        { name:
            PureScriptData.ModuleName
              ( NonEmptyArray.cons' creativeRecordModuleName
                  [ NonEmptyString.nes
                      (Proxy.Proxy :: Proxy.Proxy "ClientProgramHashValue")
                  ]
              )
        , definitionList:
            [ PureScriptWellknown.definition
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

writeFirebaseJson :: Array StaticResourceFile.StaticResourceFileResult -> NonEmptyString.NonEmptyString -> Aff.Aff Unit
writeFirebaseJson staticFileDataList clientProgramHashValue = do
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
            , functions:
                Maybe.Just
                  ( FirebaseJson.FunctionsSetting
                      { emulatorsPortNumber: UInt.fromInt 1242
                      , distributionPath: functionsDirectoryPath
                      }
                  )
            , hostingDistributionPath: hostingDirectoryPath
            , hostingRewites:
                [ FirebaseJson.Rewrite
                    { source: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "**")
                    , function: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "html")
                    }
                ]
            , hostingHeaders:
                Array.cons
                  ( FirebaseJson.SourceAndHeaders
                      { source: clientProgramHashValue
                      , headers:
                          [ FirebaseJson.Header
                              { key: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "content-type")
                              , value: NonEmptyString.toString MediaType.javaScriptMimeType
                              }
                          ]
                      }
                  )
                  ( map
                      ( \( StaticResourceFile.StaticResourceFileResult { requestPathAndUploadFileName, mediaTypeMaybe }
                        ) ->
                          ( FirebaseJson.SourceAndHeaders
                              { source: requestPathAndUploadFileName
                              , headers:
                                  [ FirebaseJson.Header
                                      { key: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "content-type")
                                      , value:
                                          NonEmptyString.toString
                                            ( MediaType.toMimeType
                                                mediaTypeMaybe
                                            )
                                      }
                                  ]
                              }
                          )
                      )
                      staticFileDataList
                  )
            }
        )
    )
  Console.logValueAsAff "firebase.json の書き込みに成功!" {}

originCodeGen :: ProductionOrDevelopment.ProductionOrDevelopment -> Aff.Aff Prelude.Unit
originCodeGen productionOrDevelopment = FileSystemWrite.writePureScript (originPureScriptModule productionOrDevelopment)

staticResourceBuild :: Aff.Aff (Array StaticResourceFile.StaticResourceFileResult)
staticResourceBuild = do
  resultList <-
    StaticResourceFile.getStaticResourceFileResult
      ( Path.DirectoryPath
          [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "narumincho-creative-record")
          , NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "resource")
          ]
      )
  copyStaticResouece resultList
  staticResourceCodeGen resultList
  pure resultList

copyStaticResouece :: Array StaticResourceFile.StaticResourceFileResult -> Aff.Aff Prelude.Unit
copyStaticResouece resultList =
  Util.toParallel
    ( map
        ( \(StaticResourceFile.StaticResourceFileResult { originalFilePath, fileType, requestPathAndUploadFileName }) ->
            FileSystemCopy.copyFileToDistributionWithoutExtensiton
              originalFilePath
              fileType
              ( Path.DistributionFilePath
                  { directoryPath: hostingDirectoryPath
                  , fileName: requestPathAndUploadFileName
                  }
              )
        )
        resultList
    )

staticResourceCodeGen :: Array StaticResourceFile.StaticResourceFileResult -> Aff.Aff Prelude.Unit
staticResourceCodeGen resultList =
  FileSystemWrite.writePureScript
    (StaticResourceFile.staticFileResultToPureScriptModule staticResourceModuleName resultList)

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

originPureScriptModule :: ProductionOrDevelopment.ProductionOrDevelopment -> PureScriptData.Module
originPureScriptModule productionOrDevelopment =
  PureScriptData.Module
    { name: originModuleName
    , definitionList:
        [ PureScriptWellknown.definition
            { name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "origin")
            , document: "アプリケーションのオリジン (コード生成結果)"
            , pType: PureScriptWellknown.nonEmptyString
            , expr:
                PureScriptWellknown.nonEmptyStringLiteral
                  ( case productionOrDevelopment of
                      ProductionOrDevelopment.Develpment ->
                        NonEmptyString.appendString
                          (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "http://localhost:"))
                          (UInt.toString hostingPortNumber)
                      ProductionOrDevelopment.Production -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://narumincho-com-dev.web.app")
                  )
            , isExport: true
            }
        ]
    }

runSpagoForFunctions :: Aff.Aff Unit
runSpagoForFunctions = do
  Spago.bundleModule
    { mainModuleName:
        PureScriptData.ModuleName
          ( NonEmptyArray.cons'
              (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "CreativeRecord"))
              [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Functions") ]
          )
    , outputJavaScriptPath:
        Path.DistributionFilePath
          { directoryPath: functionsDirectoryPath
          , fileName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "index")
          }
    }
  Console.logValueAsAff "spago で functions のビルドに成功!" {}

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
  Maybe.Nothing -> Console.logValueAsAff "functions 向けの package.json の生成に失敗した" {}

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
