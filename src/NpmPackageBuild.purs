module NpmPackageBuild where

import Prelude
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Aff as Aff
import Effect.Console as Console
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import Type.Proxy as Proxy
import TypeScript.Tsc as Tsc
import PureScript.Spago as Spago
import Util as Util

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
  Util.toParallel
    [ Tsc.compile
        { rootName:
            Path.FilePath
              { directoryPath:
                  Path.DirectoryPath
                    [ NonEmptyString.nes
                        (Proxy.Proxy :: Proxy.Proxy "gen")
                    ]
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
    ]
