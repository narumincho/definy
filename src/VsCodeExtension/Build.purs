module VsCodeExtension.Build
  ( main
  ) where

import Prelude
import Console as Console
import Data.Argonaut as Argonaut
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Aff as Aff
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
import Util as Util
import VsCodeExtension.LanguageId as LanguageId

main :: Effect.Effect Unit
main =
  Aff.runAff_ (Console.logValue "definy lsp build:")
    ( Aff.attempt
        ( Util.toParallel
            [ writePackageJsonForVsCodeExtension
            , buildExtensionMain
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
  FileSystemWrite.writeJson
    ( Path.DistributionFilePath
        { directoryPath: distributionDirectoryPath
        , fileName: Name.fromSymbolProxy (Proxy :: _ "package")
        }
    )
    generatePackageJson

generatePackageJson :: Argonaut.Json
generatePackageJson =
  PackageJson.toJson
    { author: NonEmptyString.nes (Proxy :: _ "narumincho")
    , publisher: NonEmptyString.nes (Proxy :: _ "narumincho")
    , dependencies: Map.empty :: Map.Map NonEmptyString NonEmptyString
    , description:
        NonEmptyString.nes
          (Proxy :: _ "definy VSCode extension")
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
    , name: PackageJson.nameFromSymbolProxyUnsafe (Proxy :: _ "definy")
    , vsCodeVersion: NonEmptyString.nes (Proxy :: _ "^1.64.1")
    , typeFilePath: Nothing
    , version: NonEmptyString.nes (Proxy :: _ "0.0.1")
    , activationEvents: Just [ NonEmptyString.nes (Proxy :: _ "onLanguage:definy") ]
    , contributesLanguages:
        NonEmptyArray.singleton
          ( PackageJson.ContributesLanguages
              { id: LanguageId.languageId
              , extensions:
                  [ NonEmptyString.nes (Proxy :: _ ".definy") ]
              , configuration: languageConfigurationPath
              , icon:
                  { light: iconDistributionPath
                  , dark: iconDistributionPath
                  }
              }
          )
    , browser: Path.distributionFilePathToStringBaseApp extensionMainPath FileType.JavaScript
    , icon: iconDistributionPath
    }

extensionMainPath :: Path.DistributionFilePath
extensionMainPath =
  Path.DistributionFilePath
    { directoryPath: distributionDirectoryPath
    , fileName: Name.fromSymbolProxy (Proxy :: _ "main")
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
