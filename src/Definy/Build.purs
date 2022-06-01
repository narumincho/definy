module Definy.Build
  ( build
  ) where

import Prelude
import Console as Console
import Console as ConsoleValue
import Data.Argonaut as Argonaut
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Definy.BuildCodeGen as BuildCodeGen
import Definy.ModuleName as ModuleName
import Definy.Version as Version
import Effect.Aff as Aff
import EsBuild as EsBuild
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Write as FileSystemWrite
import Firebase.FirebaseJson as FirebaseJson
import Firebase.SecurityRules as SecurityRules
import Hash as Hash
import MediaType as MediaType
import PackageJson as PackageJson
import ProductionOrDevelopment as ProductionOrDevelopment
import StaticResourceFile as StaticResourceFile
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Util as Util

build ::
  ProductionOrDevelopment.ProductionOrDevelopment ->
  NonEmptyString ->
  Aff.Aff Unit
build mode origin = do
  version <- Version.getVersion mode
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
    , codeGenAndBuildClientAndFunctionsScript mode origin version
    , buildFunctionsScript mode
    ]

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

functionsMainScriptPath :: Path.DistributionFilePath
functionsMainScriptPath =
  Path.DistributionFilePath
    { directoryPath: functionsDistributionDirectoryPath
    , fileName: Name.fromSymbolProxy (Proxy :: _ "main")
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
    [ NonEmptyString.nes (Proxy :: _ "firebase-admin")
    , NonEmptyString.nes (Proxy :: _ "firebase-functions")
    , NonEmptyString.nes (Proxy :: _ "axios")
    , NonEmptyString.nes (Proxy :: _ "jimp")
    , NonEmptyString.nes (Proxy :: _ "jsonwebtoken")
    , NonEmptyString.nes (Proxy :: _ "fs-extra")
    , NonEmptyString.nes (Proxy :: _ "sha256-uint8array")
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
        Path.distributionDirectoryPathToStringBaseFolderFromSame
          functionsMainScriptPath
          FileType.JavaScript
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

writeFirebaseJson ::
  ProductionOrDevelopment.ProductionOrDevelopment ->
  Hash.Sha256HashValue ->
  Array StaticResourceFile.StaticResourceFileResult ->
  Aff.Aff Unit
writeFirebaseJson productionOrDevelopment clientProgramHash staticResourceFileResult = do
  FileSystemWrite.writeJson
    ( Path.DistributionFilePath
        { directoryPath: Path.DistributionDirectoryPath { appName, folderNameMaybe: Nothing }
        , fileName: Name.fromSymbolProxy (Proxy :: _ "firebase")
        }
    )
    ( FirebaseJson.toJson
        ( createFirebaseJson
            productionOrDevelopment
            clientProgramHash
            staticResourceFileResult
        )
    )

createFirebaseJson ::
  ProductionOrDevelopment.ProductionOrDevelopment ->
  Hash.Sha256HashValue ->
  Array StaticResourceFile.StaticResourceFileResult ->
  FirebaseJson.FirebaseJson
createFirebaseJson productionOrDevelopment clientProgramHash staticResourceFileResult =
  FirebaseJson.FirebaseJson
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
    , hostingHeaders:
        append
          [ FirebaseJson.SourceAndHeaders
              { source: Hash.toNonEmptyString clientProgramHash
              , headers:
                  [ FirebaseJson.Header
                      { key: NonEmptyString.nes (Proxy :: _ "content-type")
                      , value: "text/javascript; charset=utf-8"
                      }
                  ]
              }
          ]
          ( map
              ( \( StaticResourceFile.StaticResourceFileResult
                    { requestPathAndUploadFileName, mediaTypeMaybe }
                ) ->
                  FirebaseJson.SourceAndHeaders
                    { source: Hash.toNonEmptyString requestPathAndUploadFileName
                    , headers:
                        [ FirebaseJson.Header
                            { key: NonEmptyString.nes (Proxy :: _ "content-type")
                            , value:
                                NonEmptyString.toString
                                  (MediaType.toMimeType mediaTypeMaybe)
                            }
                        ]
                    }
              )
              staticResourceFileResult
          )
    }

codeGenAndBuildClientAndFunctionsScript ::
  ProductionOrDevelopment.ProductionOrDevelopment ->
  NonEmptyString ->
  Version.Version ->
  Aff.Aff Unit
codeGenAndBuildClientAndFunctionsScript mode origin version = do
  { staticResourceBuild: staticResourceHashList } <-
    Util.runParallelRecord
      { staticResourceBuild
      , codeGen: outputNowModeAndOrigin mode origin version
      }
  hash <- clientProgramBuild mode
  writeFirebaseJson mode hash staticResourceHashList

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

outputNowModeAndOrigin ::
  ProductionOrDevelopment.ProductionOrDevelopment ->
  NonEmptyString ->
  Version.Version ->
  Aff.Aff Unit
outputNowModeAndOrigin productionOrDevelopment origin version =
  FileSystemWrite.writePureScript
    ( BuildCodeGen.generateNowModeAndOriginPureScriptModule
        productionOrDevelopment
        origin
        version
    )

copyStaticResource :: Array StaticResourceFile.StaticResourceFileResult -> Aff.Aff Unit
copyStaticResource resultList =
  Util.toParallel
    ( map
        ( \( StaticResourceFile.StaticResourceFileResult
              { originalFilePath, fileType, requestPathAndUploadFileName }
          ) ->
            FileSystemCopy.copyFileToDistributionWithoutExtension
              originalFilePath
              fileType
              ( Path.DistributionFilePath
                  { directoryPath: hostingDistributionPath
                  , fileName:
                      Name.fromNonEmptyStringUnsafe
                        (Hash.toNonEmptyString requestPathAndUploadFileName)
                  }
              )
        )
        resultList
    )

staticResourceCodeGen :: Array StaticResourceFile.StaticResourceFileResult -> Aff.Aff Unit
staticResourceCodeGen resultList =
  FileSystemWrite.writePureScript
    (StaticResourceFile.staticFileResultToPureScriptModule ModuleName.staticResource resultList)

clientProgramBuild ::
  ProductionOrDevelopment.ProductionOrDevelopment ->
  Aff.Aff Hash.Sha256HashValue
clientProgramBuild productionOrDevelopment = do
  fileHashValue <- runEsbuild productionOrDevelopment
  Console.logValueAsAff "クライアント向けビルド完了!" { fileHashValue }
  pure fileHashValue

runEsbuild :: ProductionOrDevelopment.ProductionOrDevelopment -> Aff.Aff Hash.Sha256HashValue
runEsbuild productionOrDevelopment = do
  clientProgramAsString <-
    EsBuild.buildTsx
      { entryPoints:
          Path.FilePath
            { directoryPath:
                Path.DirectoryPath
                  [ Name.fromSymbolProxy (Proxy :: _ "client") ]
            , fileName: Name.fromSymbolProxy (Proxy :: _ "main")
            }
      , target:
          Set.fromFoldable
            [ NonEmptyString.nes (Proxy :: _ "chrome100")
            , NonEmptyString.nes (Proxy :: _ "firefox100")
            , NonEmptyString.nes (Proxy :: _ "safari15")
            ]
      , external: Set.empty
      , define: createEsbuildDefine productionOrDevelopment
      }
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
    Nothing
    clientProgramAsString
  Console.logValueAsAff "esbuild でのビルドに成功!" {}
  pure clientProgramHashValue

buildFunctionsScript ::
  ProductionOrDevelopment.ProductionOrDevelopment ->
  Aff.Aff Unit
buildFunctionsScript productionOrDevelopment = do
  code <-
    EsBuild.buildJs
      { entryPoints:
          Path.FilePath
            { directoryPath:
                Path.DirectoryPath
                  [ Name.fromSymbolProxy (Proxy :: _ "functions") ]
            , fileName: Name.fromSymbolProxy (Proxy :: _ "main")
            }
      , target:
          Set.singleton (NonEmptyString.nes (Proxy :: _ "node16"))
      , external:
          Set.fromFoldable
            [ NonEmptyString.nes (Proxy :: _ "crypto")
            , NonEmptyString.nes (Proxy :: _ "node:crypto")
            , NonEmptyString.nes (Proxy :: _ "path")
            , NonEmptyString.nes (Proxy :: _ "tls")
            , NonEmptyString.nes (Proxy :: _ "https")
            , NonEmptyString.nes (Proxy :: _ "http")
            , NonEmptyString.nes (Proxy :: _ "zlib")
            , NonEmptyString.nes (Proxy :: _ "fs")
            , NonEmptyString.nes (Proxy :: _ "stream")
            , NonEmptyString.nes (Proxy :: _ "os")
            , NonEmptyString.nes (Proxy :: _ "net")
            , NonEmptyString.nes (Proxy :: _ "firebase-admin")
            , NonEmptyString.nes (Proxy :: _ "firebase-functions")
            , NonEmptyString.nes (Proxy :: _ "axios")
            , NonEmptyString.nes (Proxy :: _ "jimp")
            , NonEmptyString.nes (Proxy :: _ "jsonwebtoken")
            , NonEmptyString.nes (Proxy :: _ "fs-extra")
            , NonEmptyString.nes (Proxy :: _ "sha256-uint8array")
            ]
      , define: createEsbuildDefine productionOrDevelopment
      }
  FileSystemWrite.writeTextFileInDistribution
    functionsMainScriptPath
    (Just FileType.JavaScript)
    code
  Console.logValueAsAff "Functions のビルドに成功!" {}

createEsbuildDefine :: ProductionOrDevelopment.ProductionOrDevelopment -> Map.Map NonEmptyString NonEmptyString
createEsbuildDefine productionOrDevelopment =
  Map.singleton
    (NonEmptyString.nes (Proxy :: _ "process.env.NODE_ENV"))
    ( case productionOrDevelopment of
        ProductionOrDevelopment.Production ->
          NonEmptyString.nes
            (Proxy :: _ "\"production\"")
        ProductionOrDevelopment.Development ->
          NonEmptyString.nes
            (Proxy :: _ "\"development\"")
    )
