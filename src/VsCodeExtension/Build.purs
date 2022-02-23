module VsCodeExtension.Build
  ( main
  ) where

import Prelude
import Console as Console
import Data.Argonaut as Argonaut
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Aff as Aff
import EsBuild as Esbuild
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Write as FileSystemWrite
import PackageJson as PackageJson
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Util as Util
import VsCodeExtension.Path as VsCodeExtensionPath

main :: Effect.Effect Unit
main =
  Aff.runAff_ (Console.logValue "definy lsp build:")
    ( Aff.attempt
        ( Util.toParallel
            [ writePackageJsonForVsCodeExtension
            , buildExtensionMain
            , buildLanguageServer
            , writeLanguageConfiguration
            , copyIcon
            ]
        )
    )

distributionDirectoryPath :: Path.DistributionDirectoryPath
distributionDirectoryPath =
  Path.DistributionDirectoryPath
    { appName: Name.fromSymbolProxy (Proxy :: _ "definy-extension")
    , folderNameMaybe: Nothing
    }

languageConfigurationPath :: Path.DistributionFilePath
languageConfigurationPath =
  Path.DistributionFilePath
    { directoryPath: distributionDirectoryPath
    , fileName: Name.fromSymbolProxy (Proxy :: _ "language-configuration")
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
        Path.distributionFilePathToStringBaseApp extensionMainPath FileType.JavaScript
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
                  , configuration: languageConfigurationPath
                  , icon:
                      { light: iconDistributionPath
                      , dark: iconDistributionPath
                      }
                  }
              )
          )
    , browser:
        Just
          (Path.distributionFilePathToStringBaseApp extensionMainPath FileType.JavaScript)
    }

extensionMainPath :: Path.DistributionFilePath
extensionMainPath =
  Path.DistributionFilePath
    { directoryPath: distributionDirectoryPath
    , fileName: Name.fromSymbolProxy (Proxy :: _ "main")
    }

buildExtensionMain :: Aff.Aff Unit
buildExtensionMain =
  Esbuild.buildJs
    { entryPoint:
        Path.FilePath
          { directoryPath:
              Path.DirectoryPath
                [ Name.fromSymbolProxy (Proxy :: _ "output")
                , Name.fromSymbolProxy (Proxy :: _ "VsCodeExtension.Main")
                ]
          , fileName: Name.fromSymbolProxy (Proxy :: _ "index")
          }
    , outFile: extensionMainPath
    , sourcemap: true
    , external: [ NonEmptyString.nes (Proxy :: _ "vscode") ]
    }

buildLanguageServer :: Aff.Aff Unit
buildLanguageServer =
  Esbuild.buildJs
    { entryPoint:
        Path.FilePath
          { directoryPath:
              Path.DirectoryPath
                [ Name.fromSymbolProxy (Proxy :: _ "output")
                , Name.fromSymbolProxy (Proxy :: _ "VsCodeExtension.LanguageServer")
                ]
          , fileName: Name.fromSymbolProxy (Proxy :: _ "index")
          }
    , outFile:
        Path.DistributionFilePath
          { directoryPath: distributionDirectoryPath
          , fileName: VsCodeExtensionPath.languageServerFileName
          }
    , sourcemap: true
    , external: [ NonEmptyString.nes (Proxy :: _ "vscode") ]
    }

writeLanguageConfiguration :: Aff.Aff Unit
writeLanguageConfiguration =
  FileSystemWrite.writeJson
    languageConfigurationPath
    languageConfiguration

languageConfiguration :: Argonaut.Json
languageConfiguration =
  Argonaut.encodeJson
    { comments: { blockComment: [ "{-", "-}" ] }
    , brackets:
        [ [ "{", "}" ]
        , [ "[", "]" ]
        , [ "(", ")" ]
        ]
    , autoClosingPairs:
        [ Argonaut.encodeJson { open: "{", close: "}" }
        , Argonaut.encodeJson { open: "[", close: "]" }
        , Argonaut.encodeJson { open: "(", close: ")" }
        , Argonaut.encodeJson { open: "'", close: "'", notIn: [ "string", "comment" ] }
        , Argonaut.encodeJson { open: "\"", close: "\"", notIn: [ "string" ] }
        , Argonaut.encodeJson { open: "///", close: "///", notIn: [ "string" ] }
        ]
    , surroundingPairs:
        [ [ "{", "}" ]
        , [ "[", "]" ]
        , [ "(", ")" ]
        , [ "'", "'" ]
        , [ "\"", "\"" ]
        ]
    }

iconDistributionPath :: Path.DistributionFilePath
iconDistributionPath =
  Path.DistributionFilePath
    { directoryPath: distributionDirectoryPath
    , fileName: Name.fromSymbolProxy (Proxy :: _ "icon")
    }

copyIcon :: Aff.Aff Unit
copyIcon =
  FileSystemCopy.copyFileToDistribution
    ( Path.FilePath
        { directoryPath:
            Path.DirectoryPath
              [ Name.fromSymbolProxy (Proxy :: _ "static") ]
        , fileName: Name.fromSymbolProxy (Proxy :: _ "icon")
        }
    )
    iconDistributionPath
    (Just FileType.Png)
