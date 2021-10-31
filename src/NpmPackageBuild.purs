module NpmPackageBuild where

import Prelude
import Effect as Effect
import Effect.Aff as Aff
import Effect.Console as Console
import EsBuild as Esbuild
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import FileSystem.Path as Path
import Data.Maybe as Maybe

main :: Effect.Effect Unit
main =
  Aff.runAff_ Console.logShow
    ( Aff.attempt
        ( do
            mainAff
        )
    )

appName :: NonEmptyString.NonEmptyString
appName = NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "npm-package")

mainAff :: Aff.Aff Unit
mainAff =
  Esbuild.buildJs
    { entryPoints:
        Path.DistributionFilePath
          { directoryPath:
              Path.DistributionDirectoryPath
                { appName
                , folderNameMaybe:
                    Maybe.Just
                      ( NonEmptyString.nes
                          (Proxy.Proxy :: Proxy.Proxy "client-result")
                      )
                }
          , fileName:
              NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "client-result")
          }
    , outdir:
        Path.DistributionDirectoryPath
          { appName
          , folderNameMaybe:
              Maybe.Just
                ( NonEmptyString.nes
                    (Proxy.Proxy :: Proxy.Proxy "client-esbuild-result")
                )
          }
    , sourcemap: false
    , target: [ "node14" ]
    }
