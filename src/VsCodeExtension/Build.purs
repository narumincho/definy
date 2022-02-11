module VsCodeExtension.Build
  ( main
  ) where

import Prelude
import Console as Console
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Aff as Aff
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Write as FileSystemWrite
import PackageJson as PackageJson
import PureScript.Data as PureScriptData
import PureScript.Spago as Spago
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Util as Util

main :: Effect.Effect Unit
main =
  Aff.runAff_ (Console.logValue "definy lsp build:")
    ( Aff.attempt
        ( Util.toParallel
            [ writePackageJsonForVsCodeExtension
            , buildExtensionMain
            ]
        )
    )

distributionDirectoryPath :: Path.DistributionDirectoryPath
distributionDirectoryPath =
  Path.DistributionDirectoryPath
    { appName: Name.fromSymbolProxy (Proxy :: _ "definy-lsp")
    , folderNameMaybe: Nothing
    }

writePackageJsonForVsCodeExtension :: Aff.Aff Unit
writePackageJsonForVsCodeExtension = do
  rootPackageJsonResult <-
    PackageJson.readPackageVersionFromRootPackageJson
      ( Set.fromFoldable
          [ NonEmptyString.nes
              (Proxy :: _ "vscode-languageclient")
          ]
      )
  case rootPackageJsonResult of
    Either.Left error -> Console.logValueAsAff "jsonの parse エラー!" { error }
    Either.Right dependencies ->
      FileSystemWrite.writeJson
        ( Path.DistributionFilePath
            { directoryPath: distributionDirectoryPath
            , fileName: Name.fromSymbolProxy (Proxy :: _ "package")
            }
        )
        (PackageJson.toJson (generatePackageJson dependencies))

generatePackageJson :: Map.Map NonEmptyString NonEmptyString -> PackageJson.PackageJsonInput
generatePackageJson dependencies =
  PackageJson.PackageJsonInput
    { author:
        NonEmptyString.nes
          (Proxy :: _ "narumincho")
    , dependencies: dependencies
    , description:
        NonEmptyString.nes
          (Proxy :: _ "definy VSCode extension")
    , entryPoint:
        NonEmptyString.nes
          (Proxy :: _ "./main.js")
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
    , name: PackageJson.nameFromSymbolProxy (Proxy :: _ "definy-vscode-extension")
    , nodeVersionMaybe: Nothing
    , vsCodeVersionMaybe: Just (NonEmptyString.nes (Proxy :: _ "^1.64.1"))
    , typeFilePath: Nothing
    , version:
        NonEmptyString.nes (Proxy :: _ "0.0.0")
    , activationEvents: Just [ NonEmptyString.nes (Proxy :: _ "onLanguage:definy") ]
    , contributesLanguages:
        Just
          ( NonEmptyArray.singleton
              ( PackageJson.ContributesLanguages
                  { id: NonEmptyString.nes (Proxy :: _ "definy")
                  , extensions:
                      [ NonEmptyString.nes (Proxy :: _ ".definy") ]
                  }
              )
          )
    }

buildExtensionMain :: Aff.Aff Unit
buildExtensionMain =
  Spago.bundleModule
    { mainModuleName:
        PureScriptData.ModuleName
          (NonEmptyArray.cons (NonEmptyString.nes (Proxy :: _ "VsCodeExtension")) (NonEmptyArray.singleton (NonEmptyString.nes (Proxy :: _ "Main"))))
    , outputJavaScriptPath:
        Path.DistributionFilePath
          { directoryPath: distributionDirectoryPath
          , fileName: Name.fromSymbolProxy (Proxy :: _ "main")
          }
    }
