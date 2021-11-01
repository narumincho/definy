module PureScript.Spago (bundleModule, bundleApp, build) where

import Prelude
import Data.Array.NonEmpty as NonEmptyArray
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Console as Console
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
  EffectClass.liftEffect
    ( Console.log
        ( String.joinWith
            ""
            [ "spago での bundle-module に成功! mainModuleName: "
            , NonEmptyString.toString (ToString.moduleNameToString mainModuleName)
            , ", outputJavaScriptPath: "
            , NonEmptyString.toString
                ( Path.distributionFilePathToString
                    outputJavaScriptPath
                    FileType.JavaScript
                )
            ]
        )
    )

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
  EffectClass.liftEffect
    ( Console.log
        ( String.joinWith
            ""
            [ "spago での bundle-app に成功! mainModuleName: "
            , NonEmptyString.toString (ToString.moduleNameToString mainModuleName)
            , ", outputJavaScriptPath: "
            , NonEmptyString.toString
                ( Path.distributionFilePathToString
                    outputJavaScriptPath
                    FileType.JavaScript
                )
            ]
        )
    )

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
  EffectClass.liftEffect
    ( Console.log
        ( String.joinWith
            ""
            [ "spago build に成功! outputDiresctoy: "
            , NonEmptyString.toString
                (Path.distributionDirectoryPathToString outputDiresctoy)
            ]
        )
    )
