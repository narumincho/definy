module StaticResourceFile
  ( StaticResourceFileResult(..)
  , getStaticResourceFileResult
  , staticFileResultToPureScriptModule
  , staticFileResultToTypeScriptModule
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Console as Console
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Read as FileSystemRead
import Hash as Hash
import MediaType as MediaType
import PureScript.Data as PureScriptData
import PureScript.Wellknown as PureScriptWellknown
import TypeScript.Data as TypeScriptData
import TypeScript.Identifier as TsIdentifier
import Util as Util

-- | static な ファイルの解析結果
newtype StaticResourceFileResult
  = StaticResourceFileResult
  { {- 入力のファイル名. オリジナルのファイル名 -} originalFilePath :: Path.FilePath
  , fileType :: Maybe.Maybe FileType.FileType
  , fileId :: NonEmptyString
  {- 
    Firebase Hosting などにアップロードするファイル名. 拡張子は含まれない 
    ファイルの中身のハッシュ値になる.
  -}
  , requestPathAndUploadFileName :: Hash.Sha256HashValue
  , mediaTypeMaybe :: Maybe.Maybe MediaType.MimeType
  }

-- | 指定したファイルパスの SHA-256 のハッシュ値を取得する
getFileHash :: Path.FilePath -> Maybe.Maybe FileType.FileType -> Aff.Aff Hash.Sha256HashValue
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

-- | static なファイルが入っているディレクトリを分析する
getStaticResourceFileResult :: Path.DirectoryPath -> Aff.Aff (Array StaticResourceFileResult)
getStaticResourceFileResult directoryPath =
  let
    filePathListAff :: Aff.Aff (Array (Tuple.Tuple Path.FilePath (Maybe.Maybe FileType.FileType)))
    filePathListAff = FileSystemRead.readFilePathInDirectory directoryPath
  in
    do
      filePathList <- filePathListAff
      ( Util.toParallelWithReturn
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
            NonEmptyString.appendString
              ( Name.toNonEmptyString
                  (Path.filePathGetFileName filePath)
              )
              ( case fileTypeMaybe of
                  Maybe.Just fileType ->
                    Util.firstUppercase
                      (NonEmptyString.toString (FileType.toExtension fileType))
                  Maybe.Nothing -> ""
              )
        , requestPathAndUploadFileName: hashValue
        , mediaTypeMaybe: bind fileTypeMaybe FileType.toMediaType
        }
    )

staticFileResultToPureScriptModule ::
  PureScriptData.ModuleName -> Array StaticResourceFileResult -> PureScriptData.Module
staticFileResultToPureScriptModule moduleName resultList =
  PureScriptData.Module
    { name: moduleName
    , definitionList:
        map
          staticResourceFileResultToPureScriptDefinition
          resultList
    }

staticResourceFileResultToPureScriptDefinition ::
  StaticResourceFileResult -> PureScriptData.Definition
staticResourceFileResultToPureScriptDefinition (StaticResourceFileResult record) =
  PureScriptWellknown.definition
    { name: record.fileId
    , document:
        String.joinWith ""
          [ "static な ファイル の `"
          , NonEmptyString.toString (Path.filePathToString record.originalFilePath record.fileType)
          , "` をリクエストするためのURL. ファイルのハッシュ値は `"
          , NonEmptyString.toString (Hash.toNonEmptyString record.requestPathAndUploadFileName)
          , "`(コード生成結果)"
          ]
    , pType: PureScriptWellknown.structuredUrlPathAndSearchParams
    , expr:
        PureScriptWellknown.call
          PureScriptWellknown.structuredUrlFromPath
          ( PureScriptWellknown.arrayLiteral
              [ PureScriptWellknown.nonEmptyStringLiteral
                  (Hash.toNonEmptyString record.requestPathAndUploadFileName)
              ]
          )
    , isExport: true
    }

staticFileResultToTypeScriptModule ::
  Array StaticResourceFileResult -> TypeScriptData.Module
staticFileResultToTypeScriptModule resultList =
  TypeScriptData.Module
    { moduleDocument: ""
    , exportDefinitionList:
        Array.mapMaybe
          staticResourceFileResultToTypeScriptDefinition
          resultList
    }

staticResourceFileResultToTypeScriptDefinition ::
  StaticResourceFileResult -> Maybe TypeScriptData.ExportDefinition
staticResourceFileResultToTypeScriptDefinition (StaticResourceFileResult record) = case TsIdentifier.fromNonEmptyString record.fileId of
  Just name ->
    Just
      ( TypeScriptData.ExportDefinitionVariable
          ( TypeScriptData.VariableDeclaration
              { name
              , document:
                  String.joinWith ""
                    [ "static な ファイル の `"
                    , NonEmptyString.toString (Path.filePathToString record.originalFilePath record.fileType)
                    , "` のハッシュ値(`"
                    , NonEmptyString.toString (Hash.toNonEmptyString record.requestPathAndUploadFileName)
                    , "`)(コード生成結果)"
                    ]
              , type: TypeScriptData.TsTypeString
              , expr:
                  TypeScriptData.StringLiteral
                    ( NonEmptyString.toString
                        (Hash.toNonEmptyString record.requestPathAndUploadFileName)
                    )
              , export: true
              }
          )
      )
  Nothing -> Nothing
