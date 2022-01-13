module FileSystem.Write
  ( writeTextFileInDistribution
  , writePureScript
  , writeFirebaseRules
  , writeJson
  , ensureDir
  ) where

import Prelude
import Data.Argonaut.Core as ArgonautCore
import Data.Array.NonEmpty as ArrayNonEmpty
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import Effect.Class as EffectClass
import Effect.Console as Console
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as Path
import Firebase.SecurityRules as FirebaseSecurityRules
import Node.Encoding as Encoding
import Node.FS.Aff as Fs
import PureScript.Data as PureScriptData
import PureScript.ToString as PureScriptToString

-- | distribution に ファイルを文字列として書き込む 拡張子はなし
writeTextFileInDistribution :: Path.DistributionFilePath -> String -> Aff.Aff Unit
writeTextFileInDistribution distributionFilePath content =
  let
    filePath :: String
    filePath = NonEmptyString.toString (Path.distributionFilePathToStringWithoutExtensiton distributionFilePath)
  in
    do
      ensureDir
        ( Path.distributionDirectoryPathToDirectoryPath
            (Path.distributionFilePathToDirectoryPath distributionFilePath)
        )
      Fs.writeTextFile Encoding.UTF8 filePath content
      EffectClass.liftEffect (Console.log (append filePath " の書き込みに成功"))

writeJson :: Path.DistributionFilePath -> ArgonautCore.Json -> Aff.Aff Unit
writeJson distributionFilePath json =
  let
    filePath :: String
    filePath = NonEmptyString.toString (Path.distributionFilePathToString distributionFilePath FileType.Json)
  in
    do
      ensureDir (Path.distributionDirectoryPathToDirectoryPath (Path.distributionFilePathToDirectoryPath distributionFilePath))
      Fs.writeTextFile Encoding.UTF8 filePath (ArgonautCore.stringify json)
      EffectClass.liftEffect (Console.log (append filePath " の書き込みに成功"))

-- | PureScript をモジュール名をファイル名としてファイルに書く
writePureScript :: PureScriptData.Module -> Aff.Aff Unit
writePureScript pModule =
  let
    moduleNameAsNonEmptyArrayUnsnoced = ArrayNonEmpty.unsnoc (PureScriptData.moduleNameAsStringNonEmptyArray pModule)

    directoryPath :: Path.DirectoryPath
    directoryPath = Path.directoryPathPushDirectoryNameList Path.srcDirectoryPath (map Name.fromNonEmptyStringUnsafe moduleNameAsNonEmptyArrayUnsnoced.init)

    filePath :: String
    filePath =
      NonEmptyString.toString
        ( Path.filePathToString
            ( Path.FilePath
                { directoryPath
                , fileName: Name.fromNonEmptyStringUnsafe moduleNameAsNonEmptyArrayUnsnoced.last
                }
            )
            (Maybe.Just FileType.PureScript)
        )
  in
    do
      ensureDir directoryPath
      Fs.writeTextFile Encoding.UTF8 filePath (PureScriptToString.toString pModule)
      EffectClass.liftEffect (Console.log (append filePath " の書き込みに成功"))

foreign import ensureDirAsEffectFnAff :: String -> AffCompat.EffectFnAff Unit

-- | ディレクトリが存在していなければ作成する
ensureDir :: Path.DirectoryPath -> Aff.Aff Unit
ensureDir directoryPath =
  AffCompat.fromEffectFnAff
    ( ensureDirAsEffectFnAff
        (NonEmptyString.toString (Path.directoryPathToString directoryPath))
    )

-- | Firebase のセキュリティルールをファイルに書く
writeFirebaseRules :: Path.DistributionFilePath -> FirebaseSecurityRules.SecurityRules -> Aff.Aff Unit
writeFirebaseRules distributionFilePath@(Path.DistributionFilePath { directoryPath }) securityRules =
  let
    filePath :: String
    filePath =
      NonEmptyString.toString
        ( Path.distributionFilePathToString
            distributionFilePath
            FileType.FirebaseSecurityRules
        )
  in
    do
      ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
      Fs.writeTextFile Encoding.UTF8 filePath
        ( NonEmptyString.toString
            (FirebaseSecurityRules.toNonEmptyString securityRules)
        )
      EffectClass.liftEffect (Console.log (append filePath " の書き込みに成功"))
