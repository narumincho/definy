module StaticResourceFile (StaticResourceFileResult(..), getStaticResourceFileResult) where

import Prelude
import Control.Parallel as Parallel
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Array as Array
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Console as Console
import FileSystem.Path as Path
import FileSystem.Read as FileSystemRead
import Hash as Hash

-- | static な ファイルの解析結果
newtype StaticResourceFileResult
  = StaticResourceFileResult
  { {- 
      入力のファイル名. オリジナルのファイル名. 拡張子あり 
    -} originalFilePath :: Path.FilePath
  , fileId :: NonEmptyString.NonEmptyString
  {- 
    Firebase Hosting などにアップロードするファイル名. 拡張子は含まれない 
    ファイルの中身のハッシュ値になる.
  -}
  , requestPathAndUploadFileName :: NonEmptyString.NonEmptyString
  }

-- | 指定したファイルパスの SHA-256 のハッシュ値を取得する
getFileHash :: Path.FilePath -> Aff.Aff NonEmptyString.NonEmptyString
getFileHash filePath = do
  EffectClass.liftEffect
    ( Console.log
        ( append
            (NonEmptyString.toString (Path.filePathToString filePath))
            "のハッシュ値を取得中"
        )
    )
  content <- FileSystemRead.readBinaryFile filePath
  pure
    ( Hash.bufferAndMimeTypeToSha256HashValue
        { buffer: content
        , mimeType:
            show (Path.filePathGetFileType filePath)
        }
    )

firstUppercase :: String -> String
firstUppercase text = case String.uncons text of
  Maybe.Just { head, tail } -> append (String.toUpper (String.singleton head)) tail
  Maybe.Nothing -> ""

-- | static なファイルが入っているディレクトリを分析する
getStaticResourceFileResult :: Path.DirectoryPath -> Aff.Aff (Array StaticResourceFileResult)
getStaticResourceFileResult directoryPath =
  let
    filePathListAff :: Aff.Aff (Array Path.FilePath)
    filePathListAff = FileSystemRead.readFilePathInDirectory directoryPath
  in
    do
      filePathList <- filePathListAff
      result <-
        ( Parallel.parSequence
            ( map
                ( \filePath ->
                    filePathToStaticResourceFileResultAff filePath
                )
                filePathList
            )
        )
      pure (Array.catMaybes result)

filePathToStaticResourceFileResultAff :: Path.FilePath -> Aff.Aff (Maybe.Maybe StaticResourceFileResult)
filePathToStaticResourceFileResultAff filePath = do
  hashValue <- getFileHash filePath
  pure
    ( case Path.filePathGetFileType filePath of
        Maybe.Just fileType ->
          Maybe.Just
            ( StaticResourceFileResult
                { originalFilePath: filePath
                , fileId:
                    NonEmptyString.appendString (Path.filePathGetFileName filePath)
                      ( firstUppercase
                          (NonEmptyString.toString (Path.fileTypeToExtension fileType))
                      )
                , requestPathAndUploadFileName: hashValue
                }
            )
        Maybe.Nothing -> Maybe.Nothing
    )
