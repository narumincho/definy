module StaticResourceFile (StaticResourceFileResult(..), getStaticResourceFileResult) where

import Control.Parallel as Parallel
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Console as Console
import FileSystem as FileSystem
import Hash as Hash
import Prelude as Prelude

-- | static な ファイルの解析結果
newtype StaticResourceFileResult
  = StaticResourceFileResult
  { {- 
      入力のファイル名. オリジナルのファイル名. 拡張子あり 
    -} originalFilePath :: FileSystem.FilePath
  , fileId :: NonEmptyString.NonEmptyString
  , requestPath :: String
  {- 
    Firebase Hosting などにアップロードするファイル名. 拡張子は含まれない 
    ファイルの中身のハッシュ値になる.
  -}
  , uploadFileName :: String
  }

-- | 指定したファイルパスの SHA-256 のハッシュ値を取得する
getFileHash :: FileSystem.FilePath -> Aff.Aff String
getFileHash filePath@(FileSystem.FilePath { fileType }) =
  Prelude.bind
    ( EffectClass.liftEffect
        ( Console.log
            ( Prelude.append
                (NonEmptyString.toString (FileSystem.filePathToString filePath))
                "のハッシュ値を取得中"
            )
        )
    )
    ( \_ ->
        Prelude.map
          ( \content ->
              Hash.bufferAndMimeTypeToSha256HashValue
                { buffer: content, mimeType: Prelude.show fileType }
          )
          (FileSystem.readBinaryFile filePath)
    )

firstUppercase :: String -> String
firstUppercase text = case String.uncons text of
  Maybe.Just { head, tail } -> Prelude.append (String.toUpper (String.singleton head)) tail
  Maybe.Nothing -> ""

-- | static なファイルが入っているディレクトリを分析する
getStaticResourceFileResult :: FileSystem.DirectoryPath -> Aff.Aff (Array StaticResourceFileResult)
getStaticResourceFileResult directoryPath =
  let
    filePathListAff :: Aff.Aff (Array FileSystem.FilePath)
    filePathListAff = FileSystem.readFilePathInDirectory directoryPath
  in
    Prelude.bind
      filePathListAff
      ( \filePathList ->
          Parallel.parSequence
            ( Prelude.map
                ( \filePath ->
                    filePathToStaticResourceFileResultAff filePath
                )
                filePathList
            )
      )

filePathToStaticResourceFileResultAff :: FileSystem.FilePath -> Aff.Aff StaticResourceFileResult
filePathToStaticResourceFileResultAff filePath =
  Prelude.map
    ( \hashValue ->
        StaticResourceFileResult
          { originalFilePath: filePath
          , fileId:
              NonEmptyString.appendString (FileSystem.filePathFileName filePath)
                ( case FileSystem.filePathFileType filePath of
                    Maybe.Just fileType ->
                      firstUppercase
                        (NonEmptyString.toString (FileSystem.fileTypeToExtension fileType))
                    Maybe.Nothing -> ""
                )
          , requestPath: hashValue
          , uploadFileName: hashValue
          }
    )
    (getFileHash filePath)
