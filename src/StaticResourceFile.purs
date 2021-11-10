module StaticResourceFile
  ( StaticResourceFileResult(..)
  , getStaticResourceFileResult
  , staticFileResultToPureScriptModule
  ) where

import Prelude
import Control.Parallel as Parallel
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Console as Console
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Read as FileSystemRead
import Hash as Hash
import MediaType as MediaType
import PureScript.Data as PureScriptData
import PureScript.Wellknown as PureScriptWellknown

-- | static な ファイルの解析結果
newtype StaticResourceFileResult
  = StaticResourceFileResult
  { {- 
      入力のファイル名. オリジナルのファイル名
    -} originalFilePath :: Path.FilePath
  , fileType :: Maybe.Maybe FileType.FileType
  , fileId :: NonEmptyString.NonEmptyString
  {- 
    Firebase Hosting などにアップロードするファイル名. 拡張子は含まれない 
    ファイルの中身のハッシュ値になる.
  -}
  , requestPathAndUploadFileName :: NonEmptyString.NonEmptyString
  , mediaTypeMaybe :: Maybe.Maybe MediaType.MediaType
  }

-- | 指定したファイルパスの SHA-256 のハッシュ値を取得する
getFileHash :: Path.FilePath -> Maybe.Maybe FileType.FileType -> Aff.Aff NonEmptyString.NonEmptyString
getFileHash filePath fileTypeMaybe = do
  EffectClass.liftEffect
    ( Console.log
        ( append
            (NonEmptyString.toString (Path.filePathToString filePath fileTypeMaybe))
            " のハッシュ値を取得中"
        )
    )
  content <- FileSystemRead.readBinaryFile filePath fileTypeMaybe
  pure
    ( Hash.bufferAndMimeTypeToSha256HashValue
        { buffer: content
        , mimeType: show fileTypeMaybe
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
    filePathListAff :: Aff.Aff (Array (Tuple.Tuple Path.FilePath (Maybe.Maybe FileType.FileType)))
    filePathListAff = FileSystemRead.readFilePathInDirectory directoryPath
  in
    do
      filePathList <- filePathListAff
      ( Parallel.parSequence
          ( map
              ( \(Tuple.Tuple filePath fileTypeMaybe) ->
                  filePathToStaticResourceFileResultAff filePath fileTypeMaybe
              )
              filePathList
          )
      )

filePathToStaticResourceFileResultAff :: Path.FilePath -> Maybe.Maybe FileType.FileType -> Aff.Aff StaticResourceFileResult
filePathToStaticResourceFileResultAff filePath fileTypeMaybe = do
  hashValue <- getFileHash filePath fileTypeMaybe
  pure
    ( StaticResourceFileResult
        { originalFilePath: filePath
        , fileType: fileTypeMaybe
        , fileId:
            NonEmptyString.appendString (Path.filePathGetFileName filePath)
              ( case fileTypeMaybe of
                  Maybe.Just fileType ->
                    firstUppercase
                      (NonEmptyString.toString (FileType.toExtension fileType))
                  Maybe.Nothing -> ""
              )
        , requestPathAndUploadFileName: hashValue
        , mediaTypeMaybe: bind fileTypeMaybe FileType.toMediaType
        }
    )

staticFileResultToPureScriptModule :: PureScriptData.ModuleName -> Array StaticResourceFileResult -> PureScriptData.Module
staticFileResultToPureScriptModule moduleName resultList =
  PureScriptData.Module
    { name: moduleName
    , definitionList:
        map
          staticResourceFileResultToPureScriptDefinition
          resultList
    }

staticResourceFileResultToPureScriptDefinition :: StaticResourceFileResult -> PureScriptData.Definition
staticResourceFileResultToPureScriptDefinition (StaticResourceFileResult record) =
  PureScriptWellknown.definition
    { name: record.fileId
    , document:
        String.joinWith ""
          [ "static な ファイル の `"
          , NonEmptyString.toString (Path.filePathToString record.originalFilePath record.fileType)
          , "` をリクエストするためのURL. ファイルのハッシュ値は `"
          , NonEmptyString.toString record.requestPathAndUploadFileName
          , "`(コード生成結果)"
          ]
    , pType: PureScriptWellknown.structuredUrlPathAndSearchParams
    , expr:
        PureScriptWellknown.call
          PureScriptWellknown.structuredUrlFromPath
          ( PureScriptWellknown.arrayLiteral
              [ PureScriptWellknown.nonEmptyStringLiteral
                  record.requestPathAndUploadFileName
              ]
          )
    , isExport: true
    }
