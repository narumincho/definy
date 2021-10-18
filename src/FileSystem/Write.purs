module FileSystem.Write
  ( writeTextFileInDistribution
  , writePureScript
  , writeFirebaseRules
  ) where

import Prelude
import Data.Array.NonEmpty as ArrayNonEmpty
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import Effect.Class as EffectClass
import Effect.Console as Console
import FileType as FileType
import Firebase.SecurityRules as FirebaseSecurityRules
import Node.Encoding as Encoding
import Node.FS.Aff as Fs
import PureScript.Data as PureScriptData
import PureScript.ToString as PureScriptToString
import FileSystem.Path as Path

-- | distribution に ファイルを文字列として書き込む
writeTextFileInDistribution :: Path.DistributionFilePath -> String -> Aff.Aff Unit
writeTextFileInDistribution distributionFilePath content =
  let
    dirPath :: String
    dirPath =
      NonEmptyString.toString
        ( Path.distributionDirectoryPathToString
            (Path.distributionFilePathToDirectoryPath distributionFilePath)
        )

    filePath :: String
    filePath = NonEmptyString.toString (Path.distributionFilePathToString distributionFilePath)
  in
    do
      ensureDir dirPath
      Fs.writeTextFile Encoding.UTF8 filePath content
      EffectClass.liftEffect (Console.log (append filePath "の書き込みに成功"))

-- | PureScript をモジュール名をファイル名としてファイルに書く
writePureScript :: Path.DirectoryPath -> PureScriptData.Module -> Aff.Aff Unit
writePureScript srcDirectoryPath pModule =
  let
    moduleNameAsNonEmptyArrayUnsnoced = ArrayNonEmpty.unsnoc (PureScriptData.moduleNameAsStringNonEmptyArray pModule)

    directoryPath :: Path.DirectoryPath
    directoryPath = Path.directoryPathPushDirectoryNameList srcDirectoryPath moduleNameAsNonEmptyArrayUnsnoced.init

    dirPath :: String
    dirPath = NonEmptyString.toString (Path.directoryPathToString directoryPath)

    filePath :: String
    filePath =
      NonEmptyString.toString
        ( Path.filePathToString
            ( Path.FilePath
                { directoryPath
                , fileName: moduleNameAsNonEmptyArrayUnsnoced.last
                , fileType: Maybe.Just FileType.PureScript
                }
            )
        )
  in
    do
      ensureDir dirPath
      Fs.writeTextFile Encoding.UTF8 filePath (PureScriptToString.toString pModule)
      EffectClass.liftEffect (Console.log (append filePath "の書き込みに成功"))

foreign import ensureDirAsEffectFnAff :: String -> AffCompat.EffectFnAff Unit

-- | ディレクトリが存在していなければ作成する
ensureDir :: String -> Aff.Aff Unit
ensureDir path = AffCompat.fromEffectFnAff (ensureDirAsEffectFnAff path)

-- | Firebase のセキュリティルールをファイルに書く
writeFirebaseRules :: Path.DistributionDirectoryPath -> NonEmptyString.NonEmptyString -> FirebaseSecurityRules.SecurityRules -> Aff.Aff Unit
writeFirebaseRules directoryPath fileName securityRules =
  let
    dirPath :: String
    dirPath = NonEmptyString.toString (Path.distributionDirectoryPathToString directoryPath)

    filePath :: String
    filePath =
      NonEmptyString.toString
        ( Path.distributionFilePathToString
            ( Path.DistributionFilePath
                { directoryPath
                , fileName
                , fileType: Maybe.Just FileType.FirebaseSecurityRules
                }
            )
        )
  in
    do
      ensureDir dirPath
      Fs.writeTextFile Encoding.UTF8 filePath
        ( NonEmptyString.toString
            (FirebaseSecurityRules.toNonEmptyString securityRules)
        )
      EffectClass.liftEffect (Console.log (append filePath "の書き込みに成功"))
