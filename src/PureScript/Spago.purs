module PureScript.Spago (bundleModule, bundleApp, build) where

import Prelude
import Command as Command
import Console as Console
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as Path
import PureScript.Data as Data
import PureScript.ToString as ToString
import Type.Proxy (Proxy(..))

spagoCliJsFilePath :: Path.FilePath
spagoCliJsFilePath =
  Path.FilePath
    { directoryPath:
        Path.DirectoryPath
          [ Name.fromSymbolProxy (Proxy :: Proxy "node_modules")
          , Name.fromSymbolProxy (Proxy :: Proxy "spago")
          ]
    , fileName: Name.fromSymbolProxy (Proxy :: Proxy "spago")
    }

bundleModule :: { mainModuleName :: Data.ModuleName, outputJavaScriptPath :: Path.DistributionFilePath } -> Aff.Aff Unit
bundleModule { mainModuleName, outputJavaScriptPath } = do
  Command.execJsWithoutExtensionByNodeJsWithLog
    { filePath: spagoCliJsFilePath
    , parameters:
        [ NonEmptyString.nes (Proxy :: Proxy "bundle-module")
        , NonEmptyString.nes (Proxy :: Proxy "--main")
        , ToString.moduleNameToString mainModuleName
        , NonEmptyString.nes (Proxy :: Proxy "--to")
        , Path.distributionFilePathToString
            outputJavaScriptPath
            (Just FileType.JavaScript)
        ]
    }
  Console.logValueAsAff
    "spago での bundle-module に成功!"
    { mainModuleName: ToString.moduleNameToString mainModuleName
    , outputJavaScriptPath:
        Path.distributionFilePathToString
          outputJavaScriptPath
          (Just FileType.JavaScript)
    }

bundleApp :: { mainModuleName :: Data.ModuleName, outputJavaScriptPath :: Path.DistributionFilePath } -> Aff.Aff Unit
bundleApp { mainModuleName, outputJavaScriptPath } = do
  Command.execJsWithoutExtensionByNodeJsWithLog
    { filePath: spagoCliJsFilePath
    , parameters:
        [ NonEmptyString.nes (Proxy :: _ "bundle-app")
        , NonEmptyString.nes (Proxy :: _ "--main")
        , ToString.moduleNameToString mainModuleName
        , NonEmptyString.nes (Proxy :: _ "--to")
        , Path.distributionFilePathToString
            outputJavaScriptPath
            (Just FileType.JavaScript)
        ]
    }
  Console.logValueAsAff "spago での bundle-app に成功!"
    { mainModuleName: ToString.moduleNameToString mainModuleName
    , outputJavaScriptPath:
        Path.distributionFilePathToString
          outputJavaScriptPath
          (Just FileType.JavaScript)
    }

-- | ```ps1
-- | npx spago build --purs-args "-o {outputDiresctoy}"
-- | ```
build :: { outputDiresctoy :: Path.DirectoryPath } -> Aff.Aff Unit
build { outputDiresctoy } = do
  Command.execJsWithoutExtensionByNodeJsWithLog
    { filePath: spagoCliJsFilePath
    , parameters:
        [ NonEmptyString.nes (Proxy :: _ "build")
        , NonEmptyString.nes (Proxy :: _ "--purs-args")
        , append
            (NonEmptyString.nes (Proxy :: Proxy "-o "))
            (Path.directoryPathToString outputDiresctoy)
        ]
    }
  Console.logValueAsAff
    "spago build に成功!"
    { outputDiresctoy: Path.directoryPathToString outputDiresctoy }
