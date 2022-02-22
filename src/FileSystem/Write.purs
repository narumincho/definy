module FileSystem.Write
  ( ensureDir
  , writeFirebaseRules
  , writeJson
  , writePureScript
  , writeTextFileInDistribution
  , writeTextFilePathFileProtocol
  , writeTypeScriptFile
  ) where

import Prelude
import Console as Console
import Data.Argonaut as Argonaut
import Data.Array.NonEmpty as ArrayNonEmpty
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as Path
import Firebase.SecurityRules as FirebaseSecurityRules
import Node.Encoding as Encoding
import Node.FS.Aff as Fs
import PureScript.Data as PureScriptData
import PureScript.ToString as PureScriptToString
import VsCodeExtension.Uri as Uri

-- | テキストファイル書き込む
writeTextFilePathFileProtocol :: Uri.Uri -> String -> Aff.Aff Unit
writeTextFilePathFileProtocol uri content =
  AffCompat.fromEffectFnAff
    ( writeTextFilePathFileProtocolImpl
        (Uri.uriToString uri)
        content
    )

foreign import writeTextFilePathFileProtocolImpl :: String -> String -> AffCompat.EffectFnAff Unit

-- | distribution に ファイルを文字列として書き込む 拡張子はなし
writeTextFileInDistribution :: Path.DistributionFilePath -> String -> Aff.Aff Unit
writeTextFileInDistribution distributionFilePath content =
  let
    filePath :: String
    filePath =
      NonEmptyString.toString
        (Path.distributionFilePathToString distributionFilePath Nothing)
  in
    do
      ensureDir
        ( Path.distributionDirectoryPathToDirectoryPath
            (Path.distributionFilePathToDirectoryPath distributionFilePath)
        )
      Fs.writeTextFile Encoding.UTF8 filePath content
      Console.logValueAsAff "拡張子なしの文字列を書き込んだ" { filePath }

writeJson :: Path.DistributionFilePath -> Argonaut.Json -> Aff.Aff Unit
writeJson distributionFilePath json =
  let
    filePath :: String
    filePath =
      NonEmptyString.toString
        (Path.distributionFilePathToString distributionFilePath (Just FileType.Json))
  in
    do
      ensureDir (Path.distributionDirectoryPathToDirectoryPath (Path.distributionFilePathToDirectoryPath distributionFilePath))
      Fs.writeTextFile Encoding.UTF8 filePath (Argonaut.stringify json)
      Console.logValueAsAff "JSONファイルを書き込んだ" { filePath }

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
      Console.logValueAsAff "PureScriptのコードを書き込んだ" { filePath }

-- | テキストファイルを書き込む
writeTypeScriptFile :: Path.FilePath -> String -> Aff.Aff Unit
writeTypeScriptFile filePath codeAsText =
  let
    filePathAsString :: String
    filePathAsString =
      NonEmptyString.toString
        ( Path.filePathToString
            filePath
            (Maybe.Just FileType.TypeScript)
        )
  in
    do
      ensureDir (Path.filePathGetDirectoryPath filePath)
      Fs.writeTextFile Encoding.UTF8 filePathAsString codeAsText
      Console.logValueAsAff "TypeScript のファイルを書き込んだ"
        { filePath: filePathAsString }

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
            (Just FileType.FirebaseSecurityRules)
        )
  in
    do
      ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
      Fs.writeTextFile Encoding.UTF8 filePath
        ( NonEmptyString.toString
            (FirebaseSecurityRules.toNonEmptyString securityRules)
        )
      Console.logValueAsAff "Firebaseのセキュリティを書き込んだ" { filePath }
