module Definy.Build (build) where

import Prelude
import Console as Console
import Console as ConsoleValue
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either as Either
import Data.Map as Map
import Data.Maybe as Maybe
import Data.Set as Set
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Effect.Aff as Aff
import Effect.Class as EffectClass
import EsBuild as EsBuild
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Read as FileSystemRead
import FileSystem.Write as FileSystemWrite
import Firebase.FirebaseJson as FirebaseJson
import Firebase.SecurityRules as SecurityRules
import Hash as Hash
import Node.Process as Process
import PackageJson as PackageJson
import ProductionOrDevelopment as ProductionOrDevelopment
import PureScript.Data as PureScriptData
import PureScript.Wellknown as PureScriptWellknown
import StaticResourceFile as StaticResourceFile
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Util as Util

build :: ProductionOrDevelopment.ProductionOrDevelopment -> NonEmptyString.NonEmptyString -> Aff.Aff Unit
build mode origin =
  Util.toParallel
    [ FileSystemCopy.copySecretFile
        ( NonEmptyString.nes
            (Proxy.Proxy :: Proxy.Proxy "definy.json")
        )
        ( Path.DistributionFilePath
            { directoryPath: functionsDistributionDirectoryPath
            , fileName:
                NonEmptyString.nes
                  (Proxy.Proxy :: Proxy.Proxy ".runtimeconfig")
            }
        )
        FileType.Json
    , writePackageJsonForFunctions
    , codeGenAndBuildClientAndFunctionsScript mode origin
    , writeFirestoreRules
    , generateCloudStorageRules
    , writeFirebaseJson mode
    ]

codeGenAndBuildClientAndFunctionsScript :: ProductionOrDevelopment.ProductionOrDevelopment -> NonEmptyString.NonEmptyString -> Aff.Aff Unit
codeGenAndBuildClientAndFunctionsScript mode origin = do
  (Tuple.Tuple _ _) <- Tuple.Tuple <$> staticResourceBuild <*> (outputNowModeAndOrigin mode origin)
  _ <- clientProgramBuild
  pure unit

appName :: NonEmptyString.NonEmptyString
appName =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "definy")

rootDistributionDirectoryPath :: Path.DistributionDirectoryPath
rootDistributionDirectoryPath =
  Path.DistributionDirectoryPath
    { appName: appName
    , folderNameMaybe:
        Maybe.Nothing
    }

functionsDistributionDirectoryPath :: Path.DistributionDirectoryPath
functionsDistributionDirectoryPath =
  Path.DistributionDirectoryPath
    { appName: appName
    , folderNameMaybe:
        Maybe.Just
          ( NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "functions")
          )
    }

hostingDistributionPath :: Path.DistributionDirectoryPath
hostingDistributionPath =
  Path.DistributionDirectoryPath
    { appName: appName
    , folderNameMaybe:
        Maybe.Just
          ( NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "hosting")
          )
    }

esbuildClientProgramFileDirectoryPath :: Path.DistributionDirectoryPath
esbuildClientProgramFileDirectoryPath =
  Path.DistributionDirectoryPath
    { appName: appName
    , folderNameMaybe:
        Maybe.Just
          ( NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "client-esbuild-result")
          )
    }

writePackageJsonForFunctions :: Aff.Aff Unit
writePackageJsonForFunctions = do
  rootPackageJsonResult <-
    PackageJson.readPackageVersionFromRootPackageJson usingPackageInFunctions
  case rootPackageJsonResult of
    Either.Left error -> ConsoleValue.logValueAsAff "jsonの parse エラー!" { error }
    Either.Right dependencies -> case generatePackageJson dependencies of
      Maybe.Just packageJson ->
        FileSystemWrite.writeJson
          ( Path.DistributionFilePath
              { directoryPath: functionsDistributionDirectoryPath
              , fileName:
                  NonEmptyString.nes
                    (Proxy.Proxy :: Proxy.Proxy "package")
              }
          )
          (PackageJson.toJson packageJson)
      Maybe.Nothing -> ConsoleValue.logValueAsAff "名前のエラー" {}

usingPackageInFunctions :: Set.Set NonEmptyString.NonEmptyString
usingPackageInFunctions =
  Set.fromFoldable
    [ NonEmptyString.nes
        (Proxy.Proxy :: Proxy.Proxy "firebase-admin")
    , NonEmptyString.nes
        (Proxy.Proxy :: Proxy.Proxy "firebase-functions")
    , NonEmptyString.nes
        (Proxy.Proxy :: Proxy.Proxy "axios")
    , NonEmptyString.nes
        (Proxy.Proxy :: Proxy.Proxy "jimp")
    , NonEmptyString.nes
        (Proxy.Proxy :: Proxy.Proxy "jsonwebtoken")
    , NonEmptyString.nes
        (Proxy.Proxy :: Proxy.Proxy "fs-extra")
    , NonEmptyString.nes
        (Proxy.Proxy :: Proxy.Proxy "sha256-uint8array")
    ]

generatePackageJson :: Map.Map NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString -> Maybe.Maybe PackageJson.PackageJsonInput
generatePackageJson dependencies =
  map
    ( \name ->
        PackageJson.PackageJsonInput
          { author:
              NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "narumincho")
          , dependencies: dependencies
          , description:
              NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "definy in Cloud Functions for Firebase")
          , entryPoint:
              NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "functions/main.js")
          , gitHubAccountName:
              NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "narumincho")
          , gitHubRepositoryName:
              NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "definy")
          , homepage:
              StructuredUrl.StructuredUrl
                { origin:
                    NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "https://github.com")
                , pathAndSearchParams:
                    StructuredUrl.fromPath
                      [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "narumincho")
                      , NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "definy")
                      ]
                }
          , name: name
          , nodeVersion:
              NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "16")
          , typeFilePath:
              Maybe.Nothing
          , version:
              NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "1.0.0")
          }
    )
    ( PackageJson.nameFromNonEmptyString
        ( NonEmptyString.nes
            (Proxy.Proxy :: Proxy.Proxy "definy-functions")
        )
    )

definyModuleName :: NonEmptyString.NonEmptyString
definyModuleName =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "Definy")

productionOrDevelopmentModuleName :: PureScriptData.ModuleName
productionOrDevelopmentModuleName =
  PureScriptData.ModuleName
    ( NonEmptyArray.singleton
        ( NonEmptyString.nes
            (Proxy.Proxy :: Proxy.Proxy "ProductionOrDevelopment")
        )
    )

definyVersionModuleName :: PureScriptData.ModuleName
definyVersionModuleName =
  PureScriptData.ModuleName
    ( NonEmptyArray.cons' definyModuleName
        [ NonEmptyString.nes
            (Proxy.Proxy :: Proxy.Proxy "Version")
        ]
    )

staticResourceModuleName :: PureScriptData.ModuleName
staticResourceModuleName =
  PureScriptData.ModuleName
    ( NonEmptyArray.cons' definyModuleName
        [ NonEmptyString.nes
            (Proxy.Proxy :: Proxy.Proxy "StaticResource")
        ]
    )

outputNowModeAndOrigin :: ProductionOrDevelopment.ProductionOrDevelopment -> NonEmptyString.NonEmptyString -> Aff.Aff Unit
outputNowModeAndOrigin productionOrDevelopment origin = do
  pureScriptModule <- generateNowModeAndOriginPureScriptModule productionOrDevelopment origin
  FileSystemWrite.writePureScript pureScriptModule

generateNowModeAndOriginPureScriptModule :: ProductionOrDevelopment.ProductionOrDevelopment -> NonEmptyString.NonEmptyString -> Aff.Aff PureScriptData.Module
generateNowModeAndOriginPureScriptModule productionOrDevelopment origin = do
  versionDefinition <- versionDefinitionAff productionOrDevelopment
  pure
    ( PureScriptData.Module
        { name:
            PureScriptData.ModuleName
              ( NonEmptyArray.cons' definyModuleName
                  [ NonEmptyString.nes
                      (Proxy.Proxy :: Proxy.Proxy "OriginAndVersion")
                  ]
              )
        , definitionList:
            [ PureScriptWellknown.definition
                { name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "nowMode")
                , document: "実行モード (ビルド時にコード生成される)"
                , pType:
                    PureScriptWellknown.pTypeFrom
                      { moduleName: productionOrDevelopmentModuleName
                      , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ProductionOrDevelopment")
                      }
                , expr:
                    case productionOrDevelopment of
                      ProductionOrDevelopment.Development ->
                        PureScriptWellknown.tag
                          { moduleName: productionOrDevelopmentModuleName
                          , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Development")
                          }
                      ProductionOrDevelopment.Production ->
                        PureScriptWellknown.tag
                          { moduleName: productionOrDevelopmentModuleName
                          , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Production")
                          }
                , isExport: true
                }
            , PureScriptWellknown.definition
                { name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "origin")
                , document: "オリジン (ビルド時にコード生成される)"
                , pType: PureScriptWellknown.nonEmptyString
                , expr: PureScriptWellknown.nonEmptyStringLiteral origin
                , isExport: true
                }
            , versionDefinition
            ]
        }
    )

versionDefinitionAff :: ProductionOrDevelopment.ProductionOrDevelopment -> Aff.Aff PureScriptData.Definition
versionDefinitionAff = case _ of
  ProductionOrDevelopment.Development ->
    pure
      ( PureScriptWellknown.definition
          { name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "version")
          , document: "バージョン名 (ビルド時にコード生成される)"
          , pType:
              PureScriptWellknown.pTypeFrom
                { moduleName: definyVersionModuleName
                , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Version")
                }
          , expr:
              PureScriptWellknown.tag
                { moduleName: definyVersionModuleName
                , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Development")
                }
          , isExport: true
          }
      )
  ProductionOrDevelopment.Production -> do
    githubSha <- readGithubSha
    pure
      ( PureScriptWellknown.definition
          { name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "version")
          , document: "バージョン名 (ビルド時にコード生成される)"
          , pType:
              PureScriptWellknown.nonEmptyString
          , expr:
              PureScriptWellknown.call
                ( PureScriptWellknown.tag
                    { moduleName: definyVersionModuleName
                    , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Release")
                    }
                )
                (PureScriptWellknown.nonEmptyStringLiteral githubSha)
          , isExport: true
          }
      )

readGithubSha :: Aff.Aff NonEmptyString.NonEmptyString
readGithubSha =
  EffectClass.liftEffect
    ( map
        ( case _ of
            Maybe.Just githubShaValue -> case NonEmptyString.fromString githubShaValue of
              Maybe.Just githubShaAsNonEmptyString -> githubShaAsNonEmptyString
              Maybe.Nothing -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "GITHUB_SHA is empty")
            Maybe.Nothing -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "can not read GITHUB_SHA")
        )
        (Process.lookupEnv "GITHUB_SHA")
    )

firestoreSecurityRulesFilePath :: Path.DistributionFilePath
firestoreSecurityRulesFilePath =
  Path.DistributionFilePath
    { directoryPath: rootDistributionDirectoryPath
    , fileName:
        NonEmptyString.nes
          (Proxy.Proxy :: Proxy.Proxy "firestore")
    }

writeFirestoreRules :: Aff.Aff Unit
writeFirestoreRules =
  FileSystemWrite.writeFirebaseRules
    firestoreSecurityRulesFilePath
    SecurityRules.allForbiddenFirestoreRule

cloudStorageSecurityRulesFilePath :: Path.DistributionFilePath
cloudStorageSecurityRulesFilePath =
  Path.DistributionFilePath
    { directoryPath: rootDistributionDirectoryPath
    , fileName:
        NonEmptyString.nes
          (Proxy.Proxy :: Proxy.Proxy "storage")
    }

generateCloudStorageRules :: Aff.Aff Unit
generateCloudStorageRules =
  FileSystemWrite.writeFirebaseRules
    cloudStorageSecurityRulesFilePath
    SecurityRules.allForbiddenFirebaseStorageRule

writeFirebaseJson :: ProductionOrDevelopment.ProductionOrDevelopment -> Aff.Aff Unit
writeFirebaseJson _productionOrDevelopment = do
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
                  , hostingPortNumber: Maybe.Just (UInt.fromInt 2520)
                  , storagePortNumber: Maybe.Just (UInt.fromInt 9199)
                  }
            , firestoreRulesFilePath: firestoreSecurityRulesFilePath
            , functions: Maybe.Nothing
            , hostingDistributionPath: hostingDistributionPath
            , hostingRewites:
                [ FirebaseJson.Rewrite
                    { source: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "**")
                    , function: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "html")
                    }
                ]
            , hostingHeaders: []
            }
        )
    )

staticResourceBuild :: Aff.Aff (Array StaticResourceFile.StaticResourceFileResult)
staticResourceBuild = do
  resultList <-
    StaticResourceFile.getStaticResourceFileResult
      ( Path.DirectoryPath
          [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "static")
          ]
      )
  copyStaticResource resultList
  staticResourceCodeGen resultList
  pure resultList

copyStaticResource :: Array StaticResourceFile.StaticResourceFileResult -> Aff.Aff Unit
copyStaticResource resultList =
  Util.toParallel
    ( map
        ( \(StaticResourceFile.StaticResourceFileResult { originalFilePath, fileType, requestPathAndUploadFileName }) ->
            FileSystemCopy.copyFileToDistributionWithoutExtension
              originalFilePath
              fileType
              ( Path.DistributionFilePath
                  { directoryPath: hostingDistributionPath
                  , fileName: Hash.toNonEmptyString requestPathAndUploadFileName
                  }
              )
        )
        resultList
    )

staticResourceCodeGen :: Array StaticResourceFile.StaticResourceFileResult -> Aff.Aff Unit
staticResourceCodeGen resultList =
  FileSystemWrite.writePureScript
    (StaticResourceFile.staticFileResultToPureScriptModule staticResourceModuleName resultList)

clientProgramBuild :: Aff.Aff Hash.Sha256HashValue
clientProgramBuild = do
  runEsbuild
  fileHashValue <- readEsbuildResultClientProgramFile
  Console.logValueAsAff "クライアント向けビルド完了!" { fileHashValue }
  pure fileHashValue

runEsbuild :: Aff.Aff Unit
runEsbuild = do
  EsBuild.buildTsx
    { entryPoints:
        Path.FilePath
          { directoryPath:
              Path.DirectoryPath
                [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "client") ]
          , fileName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "main")
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
          , fileName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "main")
          }
      )
      FileType.JavaScript
  let
    clientProgramHashValue = Hash.stringToSha256HashValue clientProgramAsString
  FileSystemWrite.writeTextFileInDistribution
    ( Path.DistributionFilePath
        { directoryPath: hostingDistributionPath
        , fileName: Hash.toNonEmptyString clientProgramHashValue
        }
    )
    clientProgramAsString
  pure clientProgramHashValue
