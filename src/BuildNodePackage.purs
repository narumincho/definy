module BuildNodePackage where

import Prelude
import Console as ConsoleValue
import Data.Argonaut as Argonaut
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.Set as Set
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect as Effect
import Effect.Aff as Aff
import Effect.Console as Console
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Write as FileSystemWrite
import PackageJson as PackageJson
import PureScript.Data as PureScriptData
import PureScript.Spago as Spago
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
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
    [ Name.fromSymbolProxy (Proxy :: _ "gen") ]

appName :: Name.Name
appName = Name.fromSymbolProxy (Proxy :: _ "npm-package")

mainAff :: Aff.Aff Unit
mainAff =
  Util.toParallel
    [ Tsc.compile
        { rootNames:
            NonEmptyArray.singleton
              ( Tuple.Tuple
                  ( Path.FilePath
                      { directoryPath: genDirectoryPath
                      , fileName:
                          Name.fromSymbolProxy (Proxy :: _ "main")
                      }
                  )
                  Tsc.Ts
              )
        , outDirMaybe:
            Just
              ( Path.DistributionDirectoryPath
                  { appName
                  , folderNameMaybe: Maybe.Nothing
                  }
              )
        , declaration: true
        }
    , Spago.bundleModule
        { mainModuleName:
            PureScriptData.ModuleName
              ( NonEmptyArray.singleton
                  ( NonEmptyString.nes
                      (Proxy :: _ "TypeScriptEntryPoint")
                  )
              )
        , outputJavaScriptPath:
            Path.DistributionFilePath
              { directoryPath:
                  Path.DistributionDirectoryPath
                    { appName
                    , folderNameMaybe:
                        Maybe.Just
                          ( Name.fromSymbolProxy
                              (Proxy :: _ "output")
                          )
                    }
              , fileName:
                  Name.fromSymbolProxy
                    (Proxy :: _ "TypeScriptEntryPoint")
              }
        }
    , FileSystemCopy.copyFileToDistribution
        ( Path.FilePath
            { directoryPath: genDirectoryPath
            , fileName:
                Name.fromSymbolProxy (Proxy :: _ "README")
            }
        )
        ( Path.DistributionFilePath
            { directoryPath:
                Path.DistributionDirectoryPath
                  { appName
                  , folderNameMaybe: Maybe.Nothing
                  }
            , fileName:
                Name.fromSymbolProxy
                  (Proxy :: Proxy "README")
            }
        )
        (Maybe.Just FileType.Markdown)
    , FileSystemCopy.copyFileToDistribution
        ( Path.FilePath
            { directoryPath: genDirectoryPath
            , fileName:
                Name.fromSymbolProxy
                  (Proxy :: _ "LICENCE")
            }
        )
        ( Path.DistributionFilePath
            { directoryPath:
                Path.DistributionDirectoryPath
                  { appName
                  , folderNameMaybe: Maybe.Nothing
                  }
            , fileName:
                Name.fromSymbolProxy
                  (Proxy :: _ "LICENCE")
            }
        )
        Maybe.Nothing
    , writePackageJson
    ]

writePackageJson :: Aff.Aff Unit
writePackageJson = do
  rootPackageJsonResult <-
    PackageJson.readPackageVersionFromRootPackageJson usingPackageInGen
  case rootPackageJsonResult of
    Either.Left error -> ConsoleValue.logValueAsAff "jsonの parse エラー!" { error }
    Either.Right dependencies ->
      FileSystemWrite.writeJson
        ( Path.DistributionFilePath
            { directoryPath:
                Path.DistributionDirectoryPath
                  { appName
                  , folderNameMaybe: Maybe.Nothing
                  }
            , fileName:
                Name.fromSymbolProxy
                  (Proxy :: _ "package")
            }
        )
        (generatePackageJson dependencies)

usingPackageInGen :: Set.Set NonEmptyString
usingPackageInGen =
  Set.singleton
    ( NonEmptyString.nes
        (Proxy :: _ "sha256-uint8array")
    )

generatePackageJson :: Map.Map NonEmptyString NonEmptyString -> Argonaut.Json
generatePackageJson dependencies =
  PackageJson.toJson
    { author:
        NonEmptyString.nes
          (Proxy :: _ "narumincho")
    , dependencies: dependencies
    , description:
        NonEmptyString.nes
          (Proxy :: _ "HTML, TypeScript, JavaScript, package.json, wasm Generator")
    , entryPoint:
        NonEmptyString.nes
          (Proxy :: _ "gen/main.js")
    , gitHubAccountName:
        NonEmptyString.nes
          (Proxy :: _ "narumincho")
    , gitHubRepositoryName:
        NonEmptyString.nes (Proxy :: _ "definy")
    , homepage:
        StructuredUrl.StructuredUrl
          { origin:
              NonEmptyString.nes
                (Proxy :: _ "https://www.npmjs.com")
          , pathAndSearchParams:
              StructuredUrl.fromPath
                [ NonEmptyString.nes (Proxy :: _ "package")
                , NonEmptyString.nes (Proxy :: _ "@narumincho/gen")
                ]
          }
    , name: PackageJson.nameFromSymbolProxyUnsafe (Proxy :: _ "@narumincho/gen")
    , nodeVersion: NonEmptyString.nes (Proxy :: _ ">=14")
    , typeFilePath:
        NonEmptyString.nes
          (Proxy :: _ "gen/main.d.ts")
    , version:
        NonEmptyString.nes (Proxy :: _ "1.0.7")
    }
