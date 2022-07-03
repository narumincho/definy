module VsCodeExtension.Build
  ( main
  ) where

import Prelude
import Console as Console
import Data.Argonaut as Argonaut
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Aff as Aff
import EsBuild as EsBuild
import FileSystem.Copy as FileSystemCopy
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Write as FileSystemWrite
import PackageJson as PackageJson
import PureScript.Spago as Spago
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Util as Util
import VsCodeExtension.Command as Command
import VsCodeExtension.LanguageId as LanguageId

main :: Effect.Effect Unit
main =
  Aff.runAff_ (Console.logValue "definy vscode extension build:")
    ( Aff.attempt
        ( Util.toParallel
            [ writePackageJsonForVsCodeExtension
            , buildExtensionMain
            , writeLanguageConfiguration
            , copyIcon
            , copyReadMe
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
    , version: NonEmptyString.nes (Proxy :: _ "0.0.6")
    }
    ( PackageJson.packageJsonInputOptionalDefault
        { publisher = Just (NonEmptyString.nes (Proxy :: _ "narumincho"))
        , vsCodeVersion = Just (NonEmptyString.nes (Proxy :: _ "^1.67.0"))
        , activationEvents =
          Just
            [ NonEmptyString.nes (Proxy :: _ "onLanguage:definy")
            , NonEmptyString.nes (Proxy :: _ "onCommand:definy.webview")
            ]
        , contributesLanguages =
          Just
            ( NonEmptyArray.singleton
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
            )
        , contributesCommand =
          Just
            ( NonEmptyArray.singleton
                ( PackageJson.ContributesCommand
                    { command: Command.definyWebview
                    , title: NonEmptyString.nes (Proxy :: _ ".definy の拡張機能から webview を開きます")
                    }
                )
            )
        , browser = Just (Path.distributionFilePathToStringBaseApp mainScriptPath FileType.JavaScript)
        , icon = Just iconDistributionPath
        }
    )

mainScriptPath :: Path.DistributionFilePath
mainScriptPath =
  Path.DistributionFilePath
    { directoryPath: distributionDirectoryPath
    , fileName: Name.fromSymbolProxy (Proxy :: _ "main")
    }

buildExtensionMain :: Aff.Aff Unit
buildExtensionMain = do
  Spago.build
    { name: NonEmptyString.nes (Proxy :: _ "VsCodeExtension Main")
    , outputDirectory: Path.DirectoryPath [ Name.fromSymbolProxy (Proxy :: Proxy "output") ]
    }
  code <-
    EsBuild.buildJs
      { entryPoints:
          Path.FilePath
            { directoryPath:
                Path.DirectoryPath
                  [ Name.fromSymbolProxy (Proxy :: Proxy "output")
                  , Name.fromSymbolProxy (Proxy :: Proxy "VsCodeExtension.Main")
                  ]
            , fileName: Name.fromSymbolProxy (Proxy :: Proxy "index")
            }
      , target:
          Set.fromFoldable
            [ NonEmptyString.nes (Proxy :: Proxy "chrome100")
            , NonEmptyString.nes (Proxy :: Proxy "node16")
            ]
      , external: Set.singleton (NonEmptyString.nes (Proxy :: Proxy "vscode"))
      , define: Map.empty
      , format: EsBuild.CommonJs
      }
  FileSystemWrite.writeTextFileInDistribution mainScriptPath (Just FileType.JavaScript)
    (append code "const JavaScriptDynamicImport = (url) => import(url);\n")

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

copyReadMe :: Aff.Aff Unit
copyReadMe =
  FileSystemCopy.copyFileToDistribution
    ( Path.FilePath
        { directoryPath: Path.DirectoryPath []
        , fileName: Name.fromSymbolProxy (Proxy :: _ "definyVSCodeExtension")
        }
    )
    ( Path.DistributionFilePath
        { directoryPath: distributionDirectoryPath
        , fileName: Name.fromSymbolProxy (Proxy :: _ "README")
        }
    )
    (Just FileType.Markdown)
