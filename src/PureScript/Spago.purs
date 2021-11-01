module PureScript.Spago (bundleModule, bundleApp, build) where

import Prelude
import Console as Console
import Data.Array.NonEmpty as NonEmptyArray
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import PureScript.Data as Data
import PureScript.ToString as ToString
import Shell as Shell
import Type.Proxy as Proxy

bundleModule :: { mainModuleName :: Data.ModuleName, outputJavaScriptPath :: Path.DistributionFilePath } -> Aff.Aff Unit
bundleModule { mainModuleName, outputJavaScriptPath } = do
  Shell.execWithLog
    ( NonEmptyString.join1With
        ""
        ( NonEmptyArray.cons'
            ( NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "npx spago bundle-module --main ")
            )
            [ ToString.moduleNameToString mainModuleName
            , NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy " --to ")
            , Path.distributionFilePathToString
                outputJavaScriptPath
                FileType.JavaScript
            ]
        )
    )
  Console.logValueAsAff
    "spago での bundle-module に成功!"
    { mainModuleName: ToString.moduleNameToString mainModuleName
    , outputJavaScriptPath:
        Path.distributionFilePathToString
          outputJavaScriptPath
          FileType.JavaScript
    }

bundleApp :: { mainModuleName :: Data.ModuleName, outputJavaScriptPath :: Path.DistributionFilePath } -> Aff.Aff Unit
bundleApp { mainModuleName, outputJavaScriptPath } = do
  Shell.execWithLog
    ( NonEmptyString.join1With
        ""
        ( NonEmptyArray.cons'
            ( NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "npx spago bundle-app --main ")
            )
            [ ToString.moduleNameToString mainModuleName
            , NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy " --to ")
            , Path.distributionFilePathToString
                outputJavaScriptPath
                FileType.JavaScript
            ]
        )
    )
  Console.logValueAsAff "spago での bundle-app に成功!"
    { mainModuleName: ToString.moduleNameToString mainModuleName
    , outputJavaScriptPath:
        Path.distributionFilePathToString
          outputJavaScriptPath
          FileType.JavaScript
    }

-- | npx spago build --purs-args "-o {outputDiresctoy}"
build :: { outputDiresctoy :: Path.DistributionDirectoryPath } -> Aff.Aff Unit
build { outputDiresctoy } = do
  Shell.execWithLog
    ( NonEmptyString.join1With
        ""
        ( NonEmptyArray.cons'
            ( NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "npx spago build --purs-args \"-o ")
            )
            [ Path.distributionDirectoryPathToString outputDiresctoy
            , NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "\"")
            ]
        )
    )
  Console.logValueAsAff
    "spago build に成功!"
    { outputDiresctoy: Path.distributionDirectoryPathToString outputDiresctoy }
