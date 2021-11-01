module TypeScript.Tsc (compile) where

import Prelude
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import Effect.Class as EffectClass
import Effect.Console as Console
import FileSystem.Path as Path
import Type.Proxy as Proxy

-- | TypeScript 標準の コンパイラである tsc を呼ぶ
compile :: { rootName :: Path.FilePath, outDir :: Path.DistributionDirectoryPath } -> Aff.Aff Unit
compile { rootName, outDir } = do
  AffCompat.fromEffectFnAff
    ( compileAsEffectFnAff
        { rootName: NonEmptyString.toString (Path.filePathToString rootName)
        , outDir: NonEmptyString.toString (Path.distributionDirectoryPathToString outDir)
        }
    )
  EffectClass.liftEffect
    ( Console.log
        ( NonEmptyString.joinWith
            ""
            [ ( NonEmptyString.nes
                  (Proxy.Proxy :: Proxy.Proxy "tsc に成功! rootName: ")
              )
            , Path.filePathToString rootName
            , ( NonEmptyString.nes
                  (Proxy.Proxy :: Proxy.Proxy ", outDir: ")
              )
            , Path.distributionDirectoryPathToString outDir
            ]
        )
    )

foreign import compileAsEffectFnAff :: { rootName :: String, outDir :: String } -> AffCompat.EffectFnAff Unit
