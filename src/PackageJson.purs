module PackageJson
  ( PackageJsonInput(..)
  , nameFromNonEmptyString
  , Name
  , toJson
  , fromJson
  , PackageJsonOutput
  , devDependencies
  , readPackageVersionFromRootPackageJson
  ) where

import Prelude
import Data.Argonaut.Core as ArgonautCore
import Data.Array as Array
import Data.Either as Either
import Data.Map as Map
import Data.Maybe as Maybe
import Data.Set as Set
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect.Aff as Aff
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Read as FileSystemRead
import Foreign.Object as Object
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Util as Util

newtype Name
  = Name NonEmptyString.NonEmptyString

newtype PackageJsonInput
  = PackageJsonInput
  { name :: Name
  , version :: NonEmptyString.NonEmptyString
  , description :: NonEmptyString.NonEmptyString
  , gitHubAccountName :: NonEmptyString.NonEmptyString
  , gitHubRepositoryName :: NonEmptyString.NonEmptyString
  , entryPoint :: NonEmptyString.NonEmptyString
  , homepage :: StructuredUrl.StructuredUrl
  , author :: NonEmptyString.NonEmptyString
  , nodeVersion :: NonEmptyString.NonEmptyString
  , dependencies :: Map.Map NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString
  , {- 型定義(.d.ts か .ts ??)のファイルパス -} typeFilePath :: Maybe.Maybe NonEmptyString.NonEmptyString
  }

newtype PackageJsonOutput
  = PackageJsonOutput
  { dependencies :: Map.Map NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString
  , devDependencies :: Map.Map NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString
  }

devDependencies :: PackageJsonOutput -> Map.Map NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString
devDependencies (PackageJsonOutput { devDependencies: v }) = v

-- | package.json の name は 214文字以内か調べる
nameFromNonEmptyString :: NonEmptyString.NonEmptyString -> Maybe.Maybe Name
nameFromNonEmptyString rawName =
  if (>) (NonEmptyString.length rawName) 214 then
    Maybe.Nothing
  else
    Maybe.Just (Name rawName)

nameToNonEmptyString :: Name -> NonEmptyString.NonEmptyString
nameToNonEmptyString (Name name) = name

-- |  npm で パッケージをリリースするときや, firebase の Cloud Functions for Firebase でつかう ` `package.json` を出力する
-- | ライセンスは常に MIT になる.
-- | クリエイティブ・コモンズは, ロゴ用意してあったり, サイトも翻訳されていたりとしっかりしているので, 使いたいが, GitHub でリポジトリを作成するときの選択肢に出ないため, 各サイトのUI があまり対応していないと判断したため今回は選択肢なし
toJson :: PackageJsonInput -> ArgonautCore.Json
toJson (PackageJsonInput packageJson) =
  Util.tupleListToJson
    ( Array.concat
        [ [ Tuple.Tuple "name" (Util.jsonFromNonEmptyString (nameToNonEmptyString packageJson.name))
          , Tuple.Tuple "version" (Util.jsonFromNonEmptyString packageJson.version)
          , Tuple.Tuple "description" (Util.jsonFromNonEmptyString packageJson.description)
          , Tuple.Tuple "repository"
              ( Util.tupleListToJson
                  [ Tuple.Tuple "type" (ArgonautCore.fromString "git")
                  , Tuple.Tuple "url"
                      ( ArgonautCore.fromString
                          ( String.joinWith
                              ""
                              [ "git+https://github.com/"
                              , NonEmptyString.toString packageJson.gitHubAccountName
                              , "/"
                              , NonEmptyString.toString packageJson.gitHubRepositoryName
                              , ".git"
                              ]
                          )
                      )
                  ]
              )
          , Tuple.Tuple "license" (ArgonautCore.fromString "MIT")
          , Tuple.Tuple "main" (Util.jsonFromNonEmptyString packageJson.entryPoint)
          , Tuple.Tuple "homepage"
              ( Util.jsonFromNonEmptyString
                  (StructuredUrl.toString packageJson.homepage)
              )
          , Tuple.Tuple "author" (Util.jsonFromNonEmptyString packageJson.author)
          , Tuple.Tuple "engines"
              ( Util.tupleListToJson
                  [ Tuple.Tuple "node" (Util.jsonFromNonEmptyString packageJson.nodeVersion)
                  ]
              )
          , Tuple.Tuple dependenciesPropertyName
              (dependenciesToJson packageJson.dependencies)
          ]
        , case packageJson.typeFilePath of
            Maybe.Just typeFilePath -> [ Tuple.Tuple "types" (Util.jsonFromNonEmptyString typeFilePath) ]
            Maybe.Nothing -> []
        ]
    )

dependenciesToJson :: Map.Map NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString -> ArgonautCore.Json
dependenciesToJson dependencies =
  Util.tupleListToJson
    (map (\(Tuple.Tuple key value) -> Tuple.Tuple (NonEmptyString.toString key) (Util.jsonFromNonEmptyString value)) (Map.toUnfoldable dependencies))

dependenciesPropertyName :: String
dependenciesPropertyName = "dependencies"

fromJson :: ArgonautCore.Json -> PackageJsonOutput
fromJson json =
  let
    jsonAsObject :: Maybe.Maybe (Object.Object ArgonautCore.Json)
    jsonAsObject = ArgonautCore.toObject json
  in
    PackageJsonOutput
      { dependencies:
          case bind jsonAsObject
              (\obj -> Object.lookup dependenciesPropertyName obj) of
            Maybe.Just value -> case ArgonautCore.toObject value of
              Maybe.Just valueAsObject -> objectToNonEmptyStringMap valueAsObject
              Maybe.Nothing -> Map.empty
            Maybe.Nothing -> Map.empty
      , devDependencies:
          case bind jsonAsObject
              (\obj -> Object.lookup "devDependencies" obj) of
            Maybe.Just value -> case ArgonautCore.toObject value of
              Maybe.Just valueAsObject -> objectToNonEmptyStringMap valueAsObject
              Maybe.Nothing -> Map.empty
            Maybe.Nothing -> Map.empty
      }

objectToNonEmptyStringMap :: Object.Object ArgonautCore.Json -> Map.Map NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString
objectToNonEmptyStringMap object =
  let
    array :: Array (Tuple.Tuple NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString)
    array =
      Array.mapMaybe
        ( \(Tuple.Tuple key value) -> case Tuple.Tuple (NonEmptyString.fromString key) (ArgonautCore.toString value) of
            Tuple.Tuple (Maybe.Just keyAsNonEmptyString) (Maybe.Just valueAsString) -> case NonEmptyString.fromString valueAsString of
              Maybe.Just valueAsNonEmptyString -> Maybe.Just (Tuple.Tuple keyAsNonEmptyString valueAsNonEmptyString)
              Maybe.Nothing -> Maybe.Nothing
            Tuple.Tuple _ _ -> Maybe.Nothing
        )
        (Object.toUnfoldable object)
  in
    Map.fromFoldable array

-- | リポジトリのルートに保存されている `package.json` から指定したライブラリのバージョンを得る
readPackageVersionFromRootPackageJson :: Set.Set NonEmptyString.NonEmptyString -> Aff.Aff (Either.Either String (Map.Map NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString))
readPackageVersionFromRootPackageJson usingPackageNameSet = do
  rootPackageJsonResult <-
    FileSystemRead.readJsonFile
      ( Path.FilePath
          { directoryPath: Path.DirectoryPath []
          , fileName:
              NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "package")
          }
      )
      FileType.Json
  pure
    ( map
        ( \rootPackageJson ->
            Map.filterKeys
              ( \packageName ->
                  Set.member packageName usingPackageNameSet
              )
              (devDependencies (fromJson rootPackageJson))
        )
        rootPackageJsonResult
    )
