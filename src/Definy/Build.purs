module Definy.Build (build) where

import Prelude
import Console as ConsoleValue
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either as Either
import Data.Map as Map
import Data.Maybe as Maybe
import Data.Set as Set
import Data.String.NonEmpty as NonEmptyString
import Definy.Mode as Mode
import Effect.Aff as Aff
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Write as FileSystemWrite
import Firebase.SecurityRules as SecurityRules
import PackageJson as PackageJson
import PureScript.Data as PureScriptData
import PureScript.Wellknown as PureScriptWellknown
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Util as Util

build :: Mode.Mode -> NonEmptyString.NonEmptyString -> Aff.Aff Unit
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
    , outputNowModeAndOrigin mode origin
    , writeFirestoreRules
    , generateCloudStorageRules
    ]

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
                    NonEmptyString.nes
                      (Proxy.Proxy :: Proxy.Proxy "https://github.com")
                , pathAndSearchParams:
                    StructuredUrl.fromPath
                      [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "narumincho")
                      , NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "definy")
                      ]
                }
          , name: name
          , nodeVersion:
              NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "14")
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

outputNowModeAndOrigin :: Mode.Mode -> NonEmptyString.NonEmptyString -> Aff.Aff Unit
outputNowModeAndOrigin mode _origin =
  FileSystemWrite.writePureScript
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
                      { moduleName:
                          PureScriptData.ModuleName
                            ( NonEmptyArray.cons' definyModuleName
                                [ NonEmptyString.nes
                                    (Proxy.Proxy :: Proxy.Proxy "Mode")
                                ]
                            )
                      , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Mode")
                      }
                , expr:
                    case mode of
                      Mode.Develpment ->
                        PureScriptWellknown.tag
                          { moduleName:
                              PureScriptData.ModuleName
                                ( NonEmptyArray.cons' definyModuleName
                                    [ NonEmptyString.nes
                                        (Proxy.Proxy :: Proxy.Proxy "Mode")
                                    ]
                                )
                          , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Develpment")
                          }
                      Mode.Release ->
                        PureScriptWellknown.tag
                          { moduleName:
                              PureScriptData.ModuleName
                                ( NonEmptyArray.cons' definyModuleName
                                    [ NonEmptyString.nes
                                        (Proxy.Proxy :: Proxy.Proxy "Mode")
                                    ]
                                )
                          , name: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "Release")
                          }
                , isExport: true
                }
            ]
        }
    )

writeFirestoreRules :: Aff.Aff Unit
writeFirestoreRules =
  FileSystemWrite.writeFirebaseRules
    ( Path.DistributionFilePath
        { directoryPath: rootDistributionDirectoryPath
        , fileName:
            NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "firestore")
        }
    )
    SecurityRules.allForbiddenFirestoreRule

generateCloudStorageRules :: Aff.Aff Unit
generateCloudStorageRules =
  FileSystemWrite.writeFirebaseRules
    ( Path.DistributionFilePath
        { directoryPath: rootDistributionDirectoryPath
        , fileName:
            NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "storage")
        }
    )
    SecurityRules.allForbiddenFirebaseStorageRule
