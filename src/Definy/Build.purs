module Definy.Build
  ( build
  , codeGenAndBuildClientAndFunctionsScript
  ) where

import Prelude
import Console as Console
import Console as ConsoleValue
import Data.Argonaut as Argonaut
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Uncurried as EffectUncurried
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
import Node.Process as Process
import PackageJson as PackageJson
import ProductionOrDevelopment as ProductionOrDevelopment
import PureScript.Data as PureScriptData
import PureScript.Wellknown as PureScriptWellknown
import StaticResourceFile as StaticResourceFile
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Util as Util

build :: ProductionOrDevelopment.ProductionOrDevelopment -> NonEmptyString -> Aff.Aff Unit
build mode origin =
  Util.toParallel
    [ case mode of
        ProductionOrDevelopment.Production -> pure unit
        ProductionOrDevelopment.Development ->
          FileSystemCopy.copySecretFile
            ( NonEmptyString.nes
                (Proxy :: _ "definy.json")
            )
            ( Path.DistributionFilePath
                { directoryPath: functionsDistributionDirectoryPath
                , fileName:
                    Name.fromSymbolProxy
                      (Proxy :: _ ".runtimeconfig")
                }
            )
            FileType.Json
    , writePackageJsonForFunctions
    , writeFirestoreRules
    , generateCloudStorageRules
    , writeFirebaseJson mode
    , EffectClass.liftEffect
        ( EffectUncurried.runEffectFn2
            buildInTypeScript
            ( case mode of
                ProductionOrDevelopment.Development -> true
                ProductionOrDevelopment.Production -> false
            )
            (NonEmptyString.toString origin)
        )
    ]

codeGenAndBuildClientAndFunctionsScript :: ProductionOrDevelopment.ProductionOrDevelopment -> NonEmptyString -> Aff.Aff Unit
codeGenAndBuildClientAndFunctionsScript mode origin = do
  (Tuple.Tuple _ _) <- Tuple.Tuple <$> staticResourceBuild <*> (outputNowModeAndOrigin mode origin)
  _ <- clientProgramBuild
  pure unit

appName :: Name.Name
appName =
  Name.fromSymbolProxy
    (Proxy :: _ "definy")

rootDistributionDirectoryPath :: Path.DistributionDirectoryPath
rootDistributionDirectoryPath =
  Path.DistributionDirectoryPath
    { appName: appName
    , folderNameMaybe:
        Nothing
    }

functionsDistributionDirectoryPath :: Path.DistributionDirectoryPath
functionsDistributionDirectoryPath =
  Path.DistributionDirectoryPath
    { appName: appName
    , folderNameMaybe:
        Just
          ( Name.fromSymbolProxy
              (Proxy :: _ "functions")
          )
    }

hostingDistributionPath :: Path.DistributionDirectoryPath
hostingDistributionPath =
  Path.DistributionDirectoryPath
    { appName: appName
    , folderNameMaybe:
        Just
          ( Name.fromSymbolProxy
              (Proxy :: _ "hosting")
          )
    }

esbuildClientProgramFileDirectoryPath :: Path.DistributionDirectoryPath
esbuildClientProgramFileDirectoryPath =
  Path.DistributionDirectoryPath
    { appName: appName
    , folderNameMaybe:
        Just
          ( Name.fromSymbolProxy
              (Proxy :: _ "client-esbuild-result")
          )
    }

writePackageJsonForFunctions :: Aff.Aff Unit
writePackageJsonForFunctions = do
  rootPackageJsonResult <-
    PackageJson.readPackageVersionFromRootPackageJson usingPackageInFunctions
  case rootPackageJsonResult of
    Either.Left error -> ConsoleValue.logValueAsAff "jsonの parse エラー!" { error }
    Either.Right dependencies ->
      FileSystemWrite.writeJson
        ( Path.DistributionFilePath
            { directoryPath: functionsDistributionDirectoryPath
            , fileName: Name.fromSymbolProxy (Proxy :: _ "package")
            }
        )
        (generatePackageJson dependencies)

usingPackageInFunctions :: Set.Set NonEmptyString
usingPackageInFunctions =
  Set.fromFoldable
    [ NonEmptyString.nes
        (Proxy :: _ "firebase-admin")
    , NonEmptyString.nes
        (Proxy :: _ "firebase-functions")
    , NonEmptyString.nes
        (Proxy :: _ "axios")
    , NonEmptyString.nes
        (Proxy :: _ "jimp")
    , NonEmptyString.nes
        (Proxy :: _ "jsonwebtoken")
    , NonEmptyString.nes
        (Proxy :: _ "fs-extra")
    , NonEmptyString.nes
        (Proxy :: _ "sha256-uint8array")
    ]

generatePackageJson :: Map.Map NonEmptyString NonEmptyString -> Argonaut.Json
generatePackageJson dependencies =
  PackageJson.toJson
    { author:
        NonEmptyString.nes
          (Proxy :: _ "narumincho")
    , dependencies: dependencies
    , description:
        NonEmptyString.nes
          (Proxy :: _ "definy in Cloud Functions for Firebase")
    , main:
        NonEmptyString.nes
          (Proxy :: _ "./functions/main.js")
    , gitHubAccountName:
        NonEmptyString.nes
          (Proxy :: _ "narumincho")
    , gitHubRepositoryName:
        NonEmptyString.nes (Proxy :: _ "definy")
    , homepage:
        StructuredUrl.StructuredUrl
          { origin:
              NonEmptyString.nes (Proxy :: _ "https://github.com")
          , pathAndSearchParams:
              StructuredUrl.fromPath
                [ NonEmptyString.nes (Proxy :: _ "narumincho")
                , NonEmptyString.nes (Proxy :: _ "definy")
                ]
          }
    , name: PackageJson.nameFromSymbolProxyUnsafe (Proxy :: _ "definy-functions")
    , nodeVersion: NonEmptyString.nes (Proxy :: _ "16")
    , version: NonEmptyString.nes (Proxy :: _ "1.0.0")
    }

definyModuleName :: NonEmptyString
definyModuleName =
  NonEmptyString.nes
    (Proxy :: _ "Definy")

productionOrDevelopmentModuleName :: PureScriptData.ModuleName
productionOrDevelopmentModuleName =
  PureScriptData.ModuleName
    ( NonEmptyArray.singleton
        ( NonEmptyString.nes
            (Proxy :: _ "ProductionOrDevelopment")
        )
    )

definyVersionModuleName :: PureScriptData.ModuleName
definyVersionModuleName =
  PureScriptData.ModuleName
    ( NonEmptyArray.cons' definyModuleName
        [ NonEmptyString.nes
            (Proxy :: _ "Version")
        ]
    )

staticResourceModuleName :: PureScriptData.ModuleName
staticResourceModuleName =
  PureScriptData.ModuleName
    ( NonEmptyArray.cons' definyModuleName
        [ NonEmptyString.nes
            (Proxy :: _ "StaticResource")
        ]
    )

outputNowModeAndOrigin :: ProductionOrDevelopment.ProductionOrDevelopment -> NonEmptyString -> Aff.Aff Unit
outputNowModeAndOrigin productionOrDevelopment origin = do
  pureScriptModule <- generateNowModeAndOriginPureScriptModule productionOrDevelopment origin
  FileSystemWrite.writePureScript pureScriptModule

generateNowModeAndOriginPureScriptModule :: ProductionOrDevelopment.ProductionOrDevelopment -> NonEmptyString -> Aff.Aff PureScriptData.Module
generateNowModeAndOriginPureScriptModule productionOrDevelopment origin = do
  versionDefinition <- versionDefinitionAff productionOrDevelopment
  pure
    ( PureScriptData.Module
        { name:
            PureScriptData.ModuleName
              ( NonEmptyArray.cons' definyModuleName
                  [ NonEmptyString.nes
                      (Proxy :: _ "OriginAndVersion")
                  ]
              )
        , definitionList:
            [ PureScriptWellknown.definition
                { name: NonEmptyString.nes (Proxy :: _ "nowMode")
                , document: "実行モード (ビルド時にコード生成される)"
                , pType:
                    PureScriptWellknown.pTypeFrom
                      { moduleName: productionOrDevelopmentModuleName
                      , name: NonEmptyString.nes (Proxy :: _ "ProductionOrDevelopment")
                      }
                , expr:
                    case productionOrDevelopment of
                      ProductionOrDevelopment.Development ->
                        PureScriptWellknown.tag
                          { moduleName: productionOrDevelopmentModuleName
                          , name: NonEmptyString.nes (Proxy :: _ "Development")
                          }
                      ProductionOrDevelopment.Production ->
                        PureScriptWellknown.tag
                          { moduleName: productionOrDevelopmentModuleName
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
            , versionDefinition
            ]
        }
    )

versionDefinitionAff :: ProductionOrDevelopment.ProductionOrDevelopment -> Aff.Aff PureScriptData.Definition
versionDefinitionAff = case _ of
  ProductionOrDevelopment.Development ->
    pure
      ( PureScriptWellknown.definition
          { name: NonEmptyString.nes (Proxy :: _ "version")
          , document: "バージョン名 (ビルド時にコード生成される)"
          , pType:
              PureScriptWellknown.pTypeFrom
                { moduleName: definyVersionModuleName
                , name: NonEmptyString.nes (Proxy :: _ "Version")
                }
          , expr:
              PureScriptWellknown.tag
                { moduleName: definyVersionModuleName
                , name: NonEmptyString.nes (Proxy :: _ "Development")
                }
          , isExport: true
          }
      )
  ProductionOrDevelopment.Production -> do
    githubSha <- readGithubSha
    pure
      ( PureScriptWellknown.definition
          { name: NonEmptyString.nes (Proxy :: _ "version")
          , document: "バージョン名 (ビルド時にコード生成される)"
          , pType:
              PureScriptWellknown.nonEmptyString
          , expr:
              PureScriptWellknown.call
                ( PureScriptWellknown.tag
                    { moduleName: definyVersionModuleName
                    , name: NonEmptyString.nes (Proxy :: _ "Release")
                    }
                )
                (PureScriptWellknown.nonEmptyStringLiteral githubSha)
          , isExport: true
          }
      )

readGithubSha :: Aff.Aff NonEmptyString
readGithubSha =
  EffectClass.liftEffect
    ( map
        ( case _ of
            Just githubShaValue -> case NonEmptyString.fromString githubShaValue of
              Just githubShaAsNonEmptyString -> githubShaAsNonEmptyString
              Nothing -> NonEmptyString.nes (Proxy :: _ "GITHUB_SHA is empty")
            Nothing -> NonEmptyString.nes (Proxy :: _ "can not read GITHUB_SHA")
        )
        (Process.lookupEnv "GITHUB_SHA")
    )

firestoreSecurityRulesFilePath :: Path.DistributionFilePath
firestoreSecurityRulesFilePath =
  Path.DistributionFilePath
    { directoryPath: rootDistributionDirectoryPath
    , fileName:
        Name.fromSymbolProxy
          (Proxy :: _ "firestore")
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
        Name.fromSymbolProxy
          (Proxy :: _ "storage")
    }

generateCloudStorageRules :: Aff.Aff Unit
generateCloudStorageRules =
  FileSystemWrite.writeFirebaseRules
    cloudStorageSecurityRulesFilePath
    SecurityRules.allForbiddenFirebaseStorageRule

writeFirebaseJson :: ProductionOrDevelopment.ProductionOrDevelopment -> Aff.Aff Unit
writeFirebaseJson productionOrDevelopment = do
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
                  { firestorePortNumber:
                      case productionOrDevelopment of
                        ProductionOrDevelopment.Development -> Just (UInt.fromInt 8080)
                        ProductionOrDevelopment.Production -> Nothing
                  , hostingPortNumber:
                      case productionOrDevelopment of
                        ProductionOrDevelopment.Development -> Just (UInt.fromInt 2520)
                        ProductionOrDevelopment.Production -> Nothing
                  , storagePortNumber:
                      case productionOrDevelopment of
                        ProductionOrDevelopment.Development -> Just (UInt.fromInt 9199)
                        ProductionOrDevelopment.Production -> Nothing
                  }
            , firestoreRulesFilePath: firestoreSecurityRulesFilePath
            , functions: Nothing
            , hostingDistributionPath: hostingDistributionPath
            , hostingRewites:
                [ FirebaseJson.Rewrite
                    { source: NonEmptyString.nes (Proxy :: _ "/api/**")
                    , function: NonEmptyString.nes (Proxy :: _ "api")
                    }
                , FirebaseJson.Rewrite
                    { source: NonEmptyString.nes (Proxy :: _ "/pngFile/**")
                    , function: NonEmptyString.nes (Proxy :: _ "pngFile")
                    }
                , FirebaseJson.Rewrite
                    { source: NonEmptyString.nes (Proxy :: _ "**")
                    , function: NonEmptyString.nes (Proxy :: _ "html")
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
          [ Name.fromSymbolProxy (Proxy :: _ "static")
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
            FileSystemCopy.copyFileToDistribution
              originalFilePath
              ( Path.DistributionFilePath
                  { directoryPath: hostingDistributionPath
                  , fileName:
                      Name.fromNonEmptyStringUnsafe
                        (Hash.toNonEmptyString requestPathAndUploadFileName)
                  }
              )
              fileType
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
                [ Name.fromSymbolProxy (Proxy :: _ "client") ]
          , fileName: Name.fromSymbolProxy (Proxy :: _ "main")
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
          , fileName: Name.fromSymbolProxy (Proxy :: _ "main")
          }
      )
      (Just FileType.JavaScript)
  let
    clientProgramHashValue = Hash.stringToSha256HashValue clientProgramAsString
  FileSystemWrite.writeTextFileInDistribution
    ( Path.DistributionFilePath
        { directoryPath: hostingDistributionPath
        , fileName:
            Name.fromNonEmptyStringUnsafe
              (Hash.toNonEmptyString clientProgramHashValue)
        }
    )
    clientProgramAsString
  pure clientProgramHashValue

foreign import buildInTypeScript :: EffectUncurried.EffectFn2 Boolean String Unit
