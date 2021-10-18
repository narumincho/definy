module StaticResourceFile (StaticResourceFileResult(..), getStaticResourceFileResult) where

import Control.Parallel as Parallel
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Console as Console
import FileSystem.Path as Path
import FileSystem.Read as FileSystemRead
import Hash as Hash
import Prelude as Prelude

-- | static な ファイルの解析結果
newtype StaticResourceFileResult
  = StaticResourceFileResult
  { {- 
      入力のファイル名. オリジナルのファイル名. 拡張子あり 
    -} originalFilePath :: Path.FilePath
  , fileId :: NonEmptyString.NonEmptyString
  , requestPath :: String
  {- 
    Firebase Hosting などにアップロードするファイル名. 拡張子は含まれない 
    ファイルの中身のハッシュ値になる.
  -}
  , uploadFileName :: String
  }

-- | 指定したファイルパスの SHA-256 のハッシュ値を取得する
getFileHash :: Path.FilePath -> Aff.Aff String
getFileHash filePath =
  Prelude.bind
    ( EffectClass.liftEffect
        ( Console.log
            ( Prelude.append
                (NonEmptyString.toString (Path.filePathToString filePath))
                "のハッシュ値を取得中"
            )
        )
    )
    ( \_ ->
        Prelude.map
          ( \content ->
              Hash.bufferAndMimeTypeToSha256HashValue
                { buffer: content
                , mimeType:
                    Prelude.show
                      (Path.filePathGetFileType filePath)
                }
          )
          (FileSystemRead.readBinaryFile filePath)
    )

firstUppercase :: String -> String
firstUppercase text = case String.uncons text of
  Maybe.Just { head, tail } -> Prelude.append (String.toUpper (String.singleton head)) tail
  Maybe.Nothing -> ""

-- | static なファイルが入っているディレクトリを分析する
getStaticResourceFileResult :: Path.DirectoryPath -> Aff.Aff (Array StaticResourceFileResult)
getStaticResourceFileResult directoryPath =
  let
    filePathListAff :: Aff.Aff (Array Path.FilePath)
    filePathListAff = FileSystemRead.readFilePathInDirectory directoryPath
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

filePathToStaticResourceFileResultAff :: Path.FilePath -> Aff.Aff StaticResourceFileResult
filePathToStaticResourceFileResultAff filePath =
  Prelude.map
    ( \hashValue ->
        StaticResourceFileResult
          { originalFilePath: filePath
          , fileId:
              NonEmptyString.appendString (Path.filePathGetFileName filePath)
                ( case Path.filePathGetFileType filePath of
                    Maybe.Just fileType ->
                      firstUppercase
                        (NonEmptyString.toString (Path.fileTypeToExtension fileType))
                    Maybe.Nothing -> ""
                )
          , requestPath: hashValue
          , uploadFileName: hashValue
          }
    )
    (getFileHash filePath)
