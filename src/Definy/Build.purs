module Definy.Build
  ( build
  ) where

import Prelude
import Console as ConsoleValue
import Data.Argonaut as Argonaut
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Definy.Version as Version
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Uncurried as EffectUncurried
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Write as FileSystemWrite
import Firebase.FirebaseJson as FirebaseJson
import Firebase.SecurityRules as SecurityRules
import PackageJson as PackageJson
import ProductionOrDevelopment as ProductionOrDevelopment
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Util as Util

build ::
  ProductionOrDevelopment.ProductionOrDevelopment ->
  NonEmptyString ->
  Aff.Aff Unit
build mode origin = do
  _ <- Version.getVersion mode
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

foreign import buildInTypeScript :: EffectUncurried.EffectFn2 Boolean String Unit
