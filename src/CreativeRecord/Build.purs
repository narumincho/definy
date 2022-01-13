module CreativeRecord.Build (main, build) where

import Prelude
import Console as Console
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Effect as Effect
import Effect.Aff as Aff
import EsBuild as EsBuild
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Name as Name
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
import Type.Proxy (Proxy(..))
import Util as Util

main :: Effect.Effect Unit
main =
  Aff.runAff_ (Console.logValue "build aff result")
    (Aff.attempt (build ProductionOrDevelopment.Production))

appName :: Name.Name
appName = Name.fromSymbolProxy (Proxy :: _ "creative-record")

pureScriptOutputPath :: Path.DirectoryPath
pureScriptOutputPath =
  Path.DirectoryPath
    [ Name.fromSymbolProxy (Proxy :: _ "output") ]

clientProgramFileName :: Name.Name
clientProgramFileName = Name.fromSymbolProxy (Proxy :: _ "creativeRecordsClientStart")

esbuildClientProgramFileDirectoryPath :: Path.DistributionDirectoryPath
esbuildClientProgramFileDirectoryPath =
  Path.DistributionDirectoryPath
    { appName
    , folderNameMaybe:
        Just
          ( Name.fromSymbolProxy
              (Proxy :: _ "client-esbuild-result")
          )
    }

hostingDirectoryPath :: Path.DistributionDirectoryPath
hostingDirectoryPath =
  Path.DistributionDirectoryPath
    { appName
    , folderNameMaybe:
        Just
          ( Name.fromSymbolProxy
              (Proxy :: _ "hosting")
          )
    }

functionsDirectoryPath :: Path.DistributionDirectoryPath
functionsDirectoryPath =
  Path.DistributionDirectoryPath
    { appName
    , folderNameMaybe:
        Just
          ( Name.fromSymbolProxy
              (Proxy :: _ "functions")
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
  { static: staticFileData } <-
    Util.runParallelRecord
      { static: staticResourceBuild, origin: originCodeGen productionOrDevelopment }
  clinetProgramHashValue <- clientProgramBuild
  Util.toParallel
    [ writeCodeClientProgramHashValueAndFunctionBuild clinetProgramHashValue
    , writeFirebaseJson staticFileData clinetProgramHashValue
    ]
  pure unit

writeCodeClientProgramHashValueAndFunctionBuild :: Hash.Sha256HashValue -> Aff.Aff Unit
writeCodeClientProgramHashValueAndFunctionBuild clinetProgramHashValue = do
  writeCodeClientProgramHashValue clinetProgramHashValue
  runSpagoForFunctions

clientProgramBuild :: Aff.Aff Hash.Sha256HashValue
clientProgramBuild = do
  runSpagoBundleApp
  runEsbuild
  fileHashValue <- readEsbuildResultClientProgramFile
  Console.logValueAsAff "クライアント向けビルド完了!" { fileHashValue }
  pure fileHashValue

runSpagoBundleApp :: Aff.Aff Unit
runSpagoBundleApp = do
  Spago.build
    { outputDiresctoy: pureScriptOutputPath }
  Console.logValueAsAff "spago でのビルドに成功!" {}

runEsbuild :: Aff.Aff Unit
runEsbuild = do
  EsBuild.buildJs
    { entryPoints:
        Path.FilePath
          { directoryPath:
              Path.DirectoryPath []
          , fileName: clientProgramFileName
          }
    , outdir: esbuildClientProgramFileDirectoryPath
    , sourcemap: false
    , target: [ "chrome95", "firefox94", "safari15" ]
    }
  Console.logValueAsAff "esbuild でのビルドに成功!" {}

readEsbuildResultClientProgramFile :: Aff.Aff Hash.Sha256HashValue
readEsbuildResultClientProgramFile = do
  clientProgramAsString <-
    FileSystemRead.readTextFileInDistribution
      ( Path.DistributionFilePath
          { directoryPath: esbuildClientProgramFileDirectoryPath
          , fileName: clientProgramFileName
          }
      )
      FileType.JavaScript
  let
    clientProgramHashValue = Hash.stringToSha256HashValue clientProgramAsString
  FileSystemWrite.writeTextFileInDistribution
    ( Path.DistributionFilePath
        { directoryPath: hostingDirectoryPath
        , fileName:
            Name.fromNonEmptyStringUnsafe
              (Hash.toNonEmptyString clientProgramHashValue)
        }
    )
    clientProgramAsString
  pure clientProgramHashValue

writeCodeClientProgramHashValue :: Hash.Sha256HashValue -> Aff.Aff Unit
writeCodeClientProgramHashValue fileHashValue =
  FileSystemWrite.writePureScript
    ( PureScriptData.Module
        { name:
            PureScriptData.ModuleName
              ( NonEmptyArray.cons' creativeRecordModuleName
                  [ NonEmptyString.nes
                      (Proxy :: _ "ClientProgramHashValue")
                  ]
              )
        , definitionList:
            [ PureScriptWellknown.definition
                { name: NonEmptyString.nes (Proxy :: _ "clientProgramHashValue")
                , document: "クライアント向け JavaScript のファイルのハッシュ値"
                , pType: PureScriptWellknown.nonEmptyString
                , expr: PureScriptWellknown.nonEmptyStringLiteral (Hash.toNonEmptyString fileHashValue)
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
    { directoryPath: Path.DistributionDirectoryPath { appName, folderNameMaybe: Nothing }
    , fileName: Name.fromSymbolProxy (Proxy :: _ "firestore")
    }

cloudStorageSecurityRulesFilePath :: Path.DistributionFilePath
cloudStorageSecurityRulesFilePath =
  Path.DistributionFilePath
    { directoryPath:
        Path.DistributionDirectoryPath { appName, folderNameMaybe: Nothing }
    , fileName: Name.fromSymbolProxy (Proxy :: _ "storage")
    }

writeFirebaseJson :: Array StaticResourceFile.StaticResourceFileResult -> Hash.Sha256HashValue -> Aff.Aff Unit
writeFirebaseJson staticFileDataList clientProgramHashValue = do
  FileSystemWrite.writeJson
    ( Path.DistributionFilePath
        { directoryPath: Path.DistributionDirectoryPath { appName, folderNameMaybe: Nothing }
        , fileName: Name.fromSymbolProxy (Proxy :: _ "firebase")
        }
    )
    ( FirebaseJson.toJson
        ( FirebaseJson.FirebaseJson
            { cloudStorageRulesFilePath: cloudStorageSecurityRulesFilePath
            , emulators:
                FirebaseJson.Emulators
                  { firestorePortNumber: Just (UInt.fromInt 8080)
                  , hostingPortNumber: Just hostingPortNumber
                  , storagePortNumber: Just (UInt.fromInt 9199)
                  }
            , firestoreRulesFilePath: firestoreSecurityRulesFilePath
            , functions:
                Just
                  ( FirebaseJson.FunctionsSetting
                      { emulatorsPortNumber: UInt.fromInt 1242
                      , distributionPath: functionsDirectoryPath
                      }
                  )
            , hostingDistributionPath: hostingDirectoryPath
            , hostingRewites:
                [ FirebaseJson.Rewrite
                    { source: NonEmptyString.nes (Proxy :: _ "**")
                    , function: NonEmptyString.nes (Proxy :: _ "html")
                    }
                ]
            , hostingHeaders:
                Array.cons
                  ( FirebaseJson.SourceAndHeaders
                      { source: Hash.toNonEmptyString clientProgramHashValue
                      , headers:
                          [ FirebaseJson.Header
                              { key: NonEmptyString.nes (Proxy :: _ "content-type")
                              , value: NonEmptyString.toString MediaType.javaScriptMimeType
                              }
                          ]
                      }
                  )
                  ( map
                      ( \( StaticResourceFile.StaticResourceFileResult { requestPathAndUploadFileName, mediaTypeMaybe }
                        ) ->
                          FirebaseJson.SourceAndHeaders
                            { source: Hash.toNonEmptyString requestPathAndUploadFileName
                            , headers:
                                [ FirebaseJson.Header
                                    { key: NonEmptyString.nes (Proxy :: _ "content-type")
                                    , value:
                                        NonEmptyString.toString
                                          ( MediaType.toMimeType
                                              mediaTypeMaybe
                                          )
                                    }
                                ]
                            }
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
          [ Name.fromSymbolProxy (Proxy :: _ "narumincho-creative-record")
          , Name.fromSymbolProxy (Proxy :: _ "resource")
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
            FileSystemCopy.copyFileToDistributionWithoutExtension
              originalFilePath
              fileType
              ( Path.DistributionFilePath
                  { directoryPath: hostingDirectoryPath
                  , fileName:
                      Name.fromNonEmptyStringUnsafe
                        (Hash.toNonEmptyString requestPathAndUploadFileName)
                  }
              )
        )
        resultList
    )

staticResourceCodeGen :: Array StaticResourceFile.StaticResourceFileResult -> Aff.Aff Prelude.Unit
staticResourceCodeGen resultList =
  FileSystemWrite.writePureScript
    (StaticResourceFile.staticFileResultToPureScriptModule staticResourceModuleName resultList)

creativeRecordModuleName :: NonEmptyString
creativeRecordModuleName = NonEmptyString.nes (Proxy :: _ "CreativeRecord")

originModuleName :: PureScriptData.ModuleName
originModuleName =
  PureScriptData.ModuleName
    ( NonEmptyArray.cons' creativeRecordModuleName
        [ NonEmptyString.nes
            (Proxy :: _ "Origin")
        ]
    )

staticResourceModuleName :: PureScriptData.ModuleName
staticResourceModuleName =
  PureScriptData.ModuleName
    ( NonEmptyArray.cons' creativeRecordModuleName
        [ NonEmptyString.nes
            (Proxy :: _ "StaticResource")
        ]
    )

originPureScriptModule :: ProductionOrDevelopment.ProductionOrDevelopment -> PureScriptData.Module
originPureScriptModule productionOrDevelopment =
  PureScriptData.Module
    { name: originModuleName
    , definitionList:
        [ PureScriptWellknown.definition
            { name: NonEmptyString.nes (Proxy :: _ "origin")
            , document: "アプリケーションのオリジン (コード生成結果)"
            , pType: PureScriptWellknown.nonEmptyString
            , expr:
                PureScriptWellknown.nonEmptyStringLiteral
                  ( case productionOrDevelopment of
                      ProductionOrDevelopment.Development ->
                        NonEmptyString.appendString
                          (NonEmptyString.nes (Proxy :: _ "http://localhost:"))
                          (UInt.toString hostingPortNumber)
                      ProductionOrDevelopment.Production -> NonEmptyString.nes (Proxy :: _ "https://narumincho-com-dev.web.app")
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
              (NonEmptyString.nes (Proxy :: _ "CreativeRecord"))
              [ NonEmptyString.nes (Proxy :: _ "Functions") ]
          )
    , outputJavaScriptPath:
        Path.DistributionFilePath
          { directoryPath: functionsDirectoryPath
          , fileName: Name.fromSymbolProxy (Proxy :: _ "index")
          }
    }
  Console.logValueAsAff "spago で functions のビルドに成功!" {}

usingPackageInFunctions :: Set.Set NonEmptyString
usingPackageInFunctions =
  Set.fromFoldable
    [ NonEmptyString.nes
        (Proxy :: _ "firebase-admin")
    , NonEmptyString.nes
        (Proxy :: _ "firebase-functions")
    , NonEmptyString.nes
        (Proxy :: _ "sha256-uint8array")
    ]

writePackageJsonForFunctions :: Aff.Aff Unit
writePackageJsonForFunctions = do
  rootPackageJsonResult <-
    PackageJson.readPackageVersionFromRootPackageJson usingPackageInFunctions
  case rootPackageJsonResult of
    Either.Left error -> Console.logValueAsAff "jsonの parse エラー!" { error }
    Either.Right dependencies -> case packageJsonForFunctions dependencies of
      Just packageJson ->
        FileSystemWrite.writeJson
          ( Path.DistributionFilePath
              { directoryPath: functionsDirectoryPath
              , fileName:
                  Name.fromSymbolProxy
                    (Proxy :: _ "package")
              }
          )
          (PackageJson.toJson packageJson)
      Nothing -> Console.logValueAsAff "名前のエラー" {}

packageJsonForFunctions :: Map.Map NonEmptyString NonEmptyString -> Maybe PackageJson.PackageJsonInput
packageJsonForFunctions dependencies =
  Prelude.map
    ( \name ->
        PackageJson.PackageJsonInput
          { name
          , version: NonEmptyString.nes (Proxy :: _ "0.0.0")
          , description: NonEmptyString.nes (Proxy :: _ "ナルミンチョの創作記録 https://narumincho.com")
          , gitHubAccountName: NonEmptyString.nes (Proxy :: _ "narumincho")
          , gitHubRepositoryName: NonEmptyString.nes (Proxy :: _ "definy")
          , entryPoint: NonEmptyString.nes (Proxy :: _ "./index.js")
          , homepage:
              StructuredUrl.StructuredUrl
                { origin: NonEmptyString.nes (Proxy :: _ "https://narumincho.com")
                , pathAndSearchParams: StructuredUrl.pathAndSearchParams [] Map.empty
                }
          , author:
              NonEmptyString.nes
                ( Proxy ::
                    _
                      "narumincho <narumincho.starfy@gmail.com> (https://narumincho.com)"
                )
          , nodeVersion: NonEmptyString.nes (Proxy :: _ "16")
          , dependencies
          , typeFilePath: Nothing
          }
    )
    (PackageJson.nameFromNonEmptyString (Name.toNonEmptyString appName))
