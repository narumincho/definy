module PackageJson
  ( ContributesLanguages(..)
  , Name
  , PackageJsonInput(..)
  , PackageJsonOutput
  , devDependencies
  , fromJson
  , nameFromNonEmptyString
  , nameFromSymbolProxy
  , readPackageVersionFromRootPackageJson
  , toJson
  ) where

import Prelude
import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect.Aff as Aff
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Read as FileSystemRead
import Foreign.Object as Object
import StructuredUrl as StructuredUrl
import Type.Data.Symbol as Symbol
import Type.Proxy (Proxy(..))

newtype Name
  = Name NonEmptyString

newtype PackageJsonInput
  = PackageJsonInput
  { name :: Name
  , version :: NonEmptyString
  , description :: NonEmptyString
  , gitHubAccountName :: NonEmptyString
  , gitHubRepositoryName :: NonEmptyString
  , entryPoint :: NonEmptyString
  , homepage :: StructuredUrl.StructuredUrl
  , author :: NonEmptyString
  , nodeVersionMaybe :: Maybe NonEmptyString
  , vsCodeVersionMaybe :: Maybe NonEmptyString
  , dependencies :: Map.Map NonEmptyString NonEmptyString
  , {- 型定義(.d.ts か .ts ??)のファイルパス -} typeFilePath :: Maybe NonEmptyString
  , activationEvents :: Maybe (Array NonEmptyString)
  , contributesLanguages :: Maybe (NonEmptyArray ContributesLanguages)
  }

newtype ContributesLanguages
  = ContributesLanguages
  { id :: NonEmptyString
  , extensions :: Array NonEmptyString
  }

newtype PackageJsonOutput
  = PackageJsonOutput
  { dependencies :: Map.Map NonEmptyString NonEmptyString
  , devDependencies :: Map.Map NonEmptyString NonEmptyString
  }

devDependencies :: PackageJsonOutput -> Map.Map NonEmptyString NonEmptyString
devDependencies (PackageJsonOutput { devDependencies: v }) = v

-- | package.json の name は 214文字以内か調べる
nameFromNonEmptyString :: NonEmptyString -> Maybe Name
nameFromNonEmptyString rawName =
  if (>) (NonEmptyString.length rawName) 214 then
    Nothing
  else
    Just (Name rawName)

nameFromSymbolProxy :: forall symbol. (Symbol.IsSymbol symbol) => Proxy symbol -> Name
nameFromSymbolProxy symbol =
  Name
    ( case NonEmptyString.fromString (Symbol.reflectSymbol symbol) of
        Just nonEmpty -> nonEmpty
        Nothing -> NonEmptyString.nes (Proxy :: _ "packageJsonNameError")
    )

nameToNonEmptyString :: Name -> NonEmptyString
nameToNonEmptyString (Name name) = name

-- |  npm で パッケージをリリースするときや, firebase の Cloud Functions for Firebase でつかう ` `package.json` を出力する
-- | ライセンスは常に MIT になる.
-- | クリエイティブ・コモンズは, ロゴ用意してあったり, サイトも翻訳されていたりとしっかりしているので, 使いたいが, GitHub でリポジトリを作成するときの選択肢に出ないため, 各サイトのUI があまり対応していないと判断したため今回は選択肢なし
toJson :: PackageJsonInput -> Argonaut.Json
toJson (PackageJsonInput packageJson) =
  Argonaut.encodeJson
    ( Array.concat
        [ [ Tuple.Tuple "name" (Argonaut.encodeJson (nameToNonEmptyString packageJson.name))
          , Tuple.Tuple "version" (Argonaut.encodeJson packageJson.version)
          , Tuple.Tuple "description" (Argonaut.encodeJson packageJson.description)
          , Tuple.Tuple "repository"
              ( Argonaut.encodeJson
                  { type: "git"
                  , url:
                      String.joinWith
                        ""
                        [ "git+https://github.com/"
                        , NonEmptyString.toString packageJson.gitHubAccountName
                        , "/"
                        , NonEmptyString.toString packageJson.gitHubRepositoryName
                        , ".git"
                        ]
                  }
              )
          , Tuple.Tuple "license" (Argonaut.fromString "MIT")
          , Tuple.Tuple "main" (Argonaut.encodeJson packageJson.entryPoint)
          , Tuple.Tuple "homepage"
              ( Argonaut.encodeJson
                  (StructuredUrl.toString packageJson.homepage)
              )
          , Tuple.Tuple "author" (Argonaut.encodeJson packageJson.author)
          , Tuple.Tuple "engines"
              ( Argonaut.encodeJson
                  ( Array.catMaybes
                      [ case packageJson.nodeVersionMaybe of
                          Just nodeVersion ->
                            Just
                              (Tuple.Tuple "node" (Argonaut.encodeJson nodeVersion))
                          Nothing -> Nothing
                      , case packageJson.vsCodeVersionMaybe of
                          Just vsCodeVersion ->
                            Just
                              (Tuple.Tuple "vscode" (Argonaut.encodeJson vsCodeVersion))
                          Nothing -> Nothing
                      ]
                  )
              )
          , Tuple.Tuple dependenciesPropertyName
              (Argonaut.encodeJson packageJson.dependencies)
          ]
        , case packageJson.typeFilePath of
            Just typeFilePath -> [ Tuple.Tuple "types" (Argonaut.encodeJson typeFilePath) ]
            Nothing -> []
        , case packageJson.activationEvents of
            Just activationEvents ->
              [ Tuple.Tuple "activationEvents"
                  ( Argonaut.fromArray
                      (map Argonaut.encodeJson activationEvents)
                  )
              ]
            Nothing -> []
        , case packageJson.contributesLanguages of
            Just contributesLanguages ->
              [ Tuple.Tuple "contributes"
                  (createContributesValue contributesLanguages)
              ]
            Nothing -> []
        ]
    )

createContributesValue :: NonEmptyArray ContributesLanguages -> Argonaut.Json
createContributesValue languageList =
  Argonaut.encodeJson
    { languages:
        map createContributesLanguages languageList
    }

createContributesLanguages :: ContributesLanguages -> Argonaut.Json
createContributesLanguages (ContributesLanguages rec) = Argonaut.encodeJson rec

dependenciesPropertyName :: String
dependenciesPropertyName = "dependencies"

fromJson :: Argonaut.Json -> PackageJsonOutput
fromJson json =
  let
    jsonAsObject :: Maybe (Object.Object Argonaut.Json)
    jsonAsObject = Argonaut.toObject json
  in
    PackageJsonOutput
      { dependencies:
          case bind jsonAsObject
              (\obj -> Object.lookup dependenciesPropertyName obj) of
            Just value -> case Argonaut.toObject value of
              Just valueAsObject -> objectToNonEmptyStringMap valueAsObject
              Nothing -> Map.empty
            Nothing -> Map.empty
      , devDependencies:
          case bind jsonAsObject
              (\obj -> Object.lookup "devDependencies" obj) of
            Just value -> case Argonaut.toObject value of
              Just valueAsObject -> objectToNonEmptyStringMap valueAsObject
              Nothing -> Map.empty
            Nothing -> Map.empty
      }

objectToNonEmptyStringMap ::
  Object.Object Argonaut.Json ->
  Map.Map NonEmptyString NonEmptyString
objectToNonEmptyStringMap object =
  let
    array :: Array (Tuple.Tuple NonEmptyString NonEmptyString)
    array =
      Array.mapMaybe
        ( \(Tuple.Tuple key value) -> case Tuple.Tuple (NonEmptyString.fromString key) (Argonaut.toString value) of
            Tuple.Tuple (Just keyAsNonEmptyString) (Just valueAsString) -> case NonEmptyString.fromString valueAsString of
              Just valueAsNonEmptyString -> Just (Tuple.Tuple keyAsNonEmptyString valueAsNonEmptyString)
              Nothing -> Nothing
            Tuple.Tuple _ _ -> Nothing
        )
        (Object.toUnfoldable object)
  in
    Map.fromFoldable array

-- | リポジトリのルートに保存されている `package.json` から指定したライブラリのバージョンを得る
readPackageVersionFromRootPackageJson ::
  Set.Set NonEmptyString ->
  Aff.Aff
    ( Either.Either
        String
        (Map.Map NonEmptyString NonEmptyString)
    )
readPackageVersionFromRootPackageJson usingPackageNameSet = do
  rootPackageJsonResult <-
    FileSystemRead.readJsonFile
      ( Path.FilePath
          { directoryPath: Path.DirectoryPath []
          , fileName: Name.fromSymbolProxy (Proxy :: _ "package")
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
