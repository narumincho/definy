module BuildNodePackage where

import Prelude
import Console as ConsoleValue
import Data.Either as Either
import Data.Map as Map
import Data.Maybe as Maybe
import Data.Set as Set
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Aff as Aff
import Effect.Console as Console
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Read as FileSyFileSystemRead
import FileSystem.Write as FileSystemWrite
import PackageJson as PackageJson
import PureScript.Spago as Spago
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import TypeScript.Tsc as Tsc
import Util as Util

main :: Effect.Effect Unit
main =
  Aff.runAff_ Console.logShow
    ( Aff.attempt
        ( do
            mainAff
        )
    )

genDirectoryPath :: Path.DirectoryPath
genDirectoryPath =
  Path.DirectoryPath
    [ NonEmptyString.nes
        (Proxy.Proxy :: Proxy.Proxy "gen")
    ]

appName :: NonEmptyString.NonEmptyString
appName = NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "npm-package")

mainAff :: Aff.Aff Unit
mainAff =
  Util.toParallel
    [ Tsc.compile
        { rootName:
            Path.FilePath
              { directoryPath: genDirectoryPath
              , fileName:
                  NonEmptyString.nes
                    (Proxy.Proxy :: Proxy.Proxy "main")
              , fileType: Maybe.Just FileType.TypeScript
              }
        , outDir:
            Path.DistributionDirectoryPath
              { appName
              , folderNameMaybe: Maybe.Nothing
              }
        }
    , Spago.build
        { outputDiresctoy:
            Path.DistributionDirectoryPath
              { appName
              , folderNameMaybe:
                  Maybe.Just
                    ( NonEmptyString.nes
                        (Proxy.Proxy :: Proxy.Proxy "output")
                    )
              }
        }
    , FileSystemCopy.copyFileToDistribution
        ( Path.FilePath
            { directoryPath: genDirectoryPath
            , fileName:
                NonEmptyString.nes
                  (Proxy.Proxy :: Proxy.Proxy "README")
            , fileType: Maybe.Just FileType.Markdown
            }
        )
        ( Path.DistributionFilePath
            { directoryPath:
                Path.DistributionDirectoryPath
                  { appName
                  , folderNameMaybe: Maybe.Nothing
                  }
            , fileName:
                NonEmptyString.nes
                  (Proxy.Proxy :: Proxy.Proxy "README")
            }
        )
        FileType.Markdown
    , FileSystemCopy.copyFileToDistributionWithoutExtensiton
        ( Path.FilePath
            { directoryPath: genDirectoryPath
            , fileName:
                NonEmptyString.nes
                  (Proxy.Proxy :: Proxy.Proxy "LICENCE")
            , fileType: Maybe.Nothing
            }
        )
        ( Path.DistributionFilePath
            { directoryPath:
                Path.DistributionDirectoryPath
                  { appName
                  , folderNameMaybe: Maybe.Nothing
                  }
            , fileName:
                NonEmptyString.nes
                  (Proxy.Proxy :: Proxy.Proxy "LICENCE")
            }
        )
    , writePackageJson
    ]

writePackageJson :: Aff.Aff Unit
writePackageJson = do
  rootPackageJsonResult <-
    FileSyFileSystemRead.readJsonFile
      ( Path.FilePath
          { directoryPath: Path.DirectoryPath []
          , fileName:
              NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "package")
          , fileType: Maybe.Just FileType.Json
          }
      )
  case rootPackageJsonResult of
    Either.Left error -> ConsoleValue.logValueAsAff "jsonの parse エラー!" { error }
    Either.Right rootPackageJson -> case generatePackageJson (PackageJson.fromJson rootPackageJson) of
      Maybe.Just packageJson ->
        FileSystemWrite.writeJson
          ( Path.DistributionFilePath
              { directoryPath:
                  Path.DistributionDirectoryPath
                    { appName
                    , folderNameMaybe: Maybe.Nothing
                    }
              , fileName:
                  NonEmptyString.nes
                    (Proxy.Proxy :: Proxy.Proxy "package")
              }
          )
          (PackageJson.toJson packageJson)
      Maybe.Nothing -> ConsoleValue.logValueAsAff "名前のエラー" {}

usingPackageInGen :: Set.Set NonEmptyString.NonEmptyString
usingPackageInGen =
  Set.singleton
    ( NonEmptyString.nes
        (Proxy.Proxy :: Proxy.Proxy "sha256-uint8array")
    )

generatePackageJson :: PackageJson.PackageJsonOutput -> Maybe.Maybe PackageJson.PackageJsonInput
generatePackageJson rootPackageJson =
  map
    ( \name ->
        PackageJson.PackageJsonInput
          { author:
              NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "narumincho")
          , dependencies:
              Map.filterKeys
                ( \packageName ->
                    Set.member packageName usingPackageInGen
                )
                (PackageJson.devDependencies rootPackageJson)
          , description:
              NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "HTML, TypeScript, JavaScript, package.json, wasm Generator")
          , entryPoint:
              NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "./gen/main.js")
          , gitHubAccountName:
              NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "narumincho")
          , gitHubRepositoryName:
              NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "definy")
          , homepage:
              StructuredUrl.StructuredUrl
                { origin:
                    NonEmptyString.nes
                      (Proxy.Proxy :: Proxy.Proxy "https://www.npmjs.com")
                , pathAndSearchParams:
                    StructuredUrl.fromPath
                      [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "package")
                      , NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "@narumincho/gen")
                      ]
                }
          , name: name
          , nodeVersion:
              NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy ">=14")
          , typeFilePath:
              Maybe.Just
                ( NonEmptyString.nes
                    (Proxy.Proxy :: Proxy.Proxy "./gen/main.d.ts")
                )
          , version:
              NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "1.0.5")
          }
    )
    ( PackageJson.nameFromNonEmptyString
        ( NonEmptyString.nes
            (Proxy.Proxy :: Proxy.Proxy "@narumincho/gen")
        )
    )
