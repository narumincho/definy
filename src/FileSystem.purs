module FileSystem
  ( DistributionFilePath(..)
  , DistributionDirectoryPath(..)
  , distributionFilePathToDirectoryPathString
  , writeTextFile
  , readTextFile
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe as Maybe
import Data.String as String
import Effect.Aff as Aff
import Node.Encoding as Encoding
import Node.FS.Aff as Fs
import Prelude as Prelude
import Effect.Aff.Compat as AffCompat
import Effect.Class as EffectClass
import Node.Buffer as Buffer
import Effect.Console as Console

newtype DistributionDirectoryPath
  = DistributionDirectoryPath
  { appName :: String
  , folderNameMaybe :: Maybe.Maybe String
  }

newtype DistributionFilePath
  = DistributionFilePath
  { directoryPath :: DistributionDirectoryPath
  , fileName :: String
  }

distributionFilePathToDirectoryPathString :: DistributionDirectoryPath -> String
distributionFilePathToDirectoryPathString (DistributionDirectoryPath { appName, folderNameMaybe }) =
  String.joinWith "/"
    ( Array.concat
        [ [ ".", "distribution", appName ]
        , case folderNameMaybe of
            Maybe.Just folderName -> [ folderName ]
            Maybe.Nothing -> []
        ]
    )

distributionFilePathToFilePathString :: DistributionFilePath -> String
distributionFilePathToFilePathString (DistributionFilePath { directoryPath, fileName }) = String.joinWith "/" [ distributionFilePathToDirectoryPathString directoryPath, fileName ]

distributionFilePathToDirectoryPath :: DistributionFilePath -> DistributionDirectoryPath
distributionFilePathToDirectoryPath (DistributionFilePath { directoryPath }) = directoryPath

-- | distribution に ファイルを文字列として書き込む
writeTextFile :: DistributionFilePath -> String -> Aff.Aff Prelude.Unit
writeTextFile distributionFilePath content =
  let
    dirPath :: String
    dirPath = distributionFilePathToDirectoryPathString (distributionFilePathToDirectoryPath distributionFilePath)

    filePath :: String
    filePath = distributionFilePathToFilePathString distributionFilePath
  in
    Prelude.bind
      ( Prelude.bind
          (ensureDir dirPath)
          (\_ -> Fs.writeTextFile Encoding.UTF8 filePath content)
      )
      ( \_ ->
          EffectClass.liftEffect (Console.log (Prelude.append filePath "の書き込みに成功"))
      )

foreign import ensureDirAsEffectFnAff :: String -> AffCompat.EffectFnAff Unit

ensureDir :: String -> Aff.Aff Prelude.Unit
ensureDir path = AffCompat.fromEffectFnAff (ensureDirAsEffectFnAff path)

-- | distribution にあるファイルを文字列として読み取る
readTextFile :: DistributionFilePath -> Aff.Aff String
readTextFile distributionFilePath =
  Prelude.bind
    (Fs.readFile (distributionFilePathToFilePathString distributionFilePath))
    (\buffer -> EffectClass.liftEffect (Buffer.toString Encoding.UTF8 buffer))
