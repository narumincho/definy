module Definy.Build (build) where

import Prelude
import Data.Map as Map
import Data.Maybe as Maybe
import Data.Set as Set
import Data.String.NonEmpty as NonEmptyString
import Definy.Mode as Mode
import Effect.Aff as Aff
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import PackageJson as PackageJson
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Util as Util
import Data.Either as Either
import Console as ConsoleValue
import FileSystem.Write as FileSystemWrite

build :: Mode.Mode -> Aff.Aff Unit
build _ =
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
    ]

functionsDistributionDirectoryPath :: Path.DistributionDirectoryPath
functionsDistributionDirectoryPath =
  Path.DistributionDirectoryPath
    { appName:
        NonEmptyString.nes
          (Proxy.Proxy :: Proxy.Proxy "definy")
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
