module PackageJson
  ( ContributesLanguages(..)
  , Name
  , PackageJsonOutput
  , devDependencies
  , fromJson
  , nameFromNonEmptyString
  , nameFromSymbolProxyUnsafe
  , packageJsonInputOptionalDefault
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
import Util as Util

newtype Name
  = Name NonEmptyString

type PackageJsonInputRequired
  = { name :: Name
    , version :: NonEmptyString
    , description :: NonEmptyString
    , gitHubAccountName :: NonEmptyString
    , gitHubRepositoryName :: NonEmptyString
    , homepage :: StructuredUrl.StructuredUrl
    , author :: NonEmptyString
    , dependencies :: Map.Map NonEmptyString NonEmptyString
    }

type PackageJsonInputOptional
  = { main :: Maybe NonEmptyString
    , nodeVersion :: Maybe NonEmptyString
    , vsCodeVersion :: Maybe NonEmptyString
    , {- 型定義(.d.ts か .ts ??)のファイルパス -} typeFilePath :: Maybe NonEmptyString
    , activationEvents :: Maybe (Array NonEmptyString)
    , contributesLanguages :: Maybe (NonEmptyArray ContributesLanguages)
    , browser :: Maybe NonEmptyString
    , publisher :: Maybe NonEmptyString
    , icon :: Maybe Path.DistributionFilePath
    }

packageJsonInputOptionalDefault :: PackageJsonInputOptional
packageJsonInputOptionalDefault =
  { main: Nothing
  , nodeVersion: Nothing
  , vsCodeVersion: Nothing
  , typeFilePath: Nothing
  , activationEvents: Nothing
  , contributesLanguages: Nothing
  , browser: Nothing
  , publisher: Nothing
  , icon: Nothing
  }

newtype ContributesLanguages
  = ContributesLanguages
  { id :: NonEmptyString
  , extensions :: Array NonEmptyString
  , configuration :: Path.DistributionFilePath
  , icon ::
      { light :: Path.DistributionFilePath
      , dark :: Path.DistributionFilePath
      }
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

nameFromSymbolProxyUnsafe :: forall symbol. (Symbol.IsSymbol symbol) => Proxy symbol -> Name
nameFromSymbolProxyUnsafe symbol =
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
toJson ::
  PackageJsonInputRequired ->
  PackageJsonInputOptional ->
  Argonaut.Json
toJson option optionalOption =
  Util.tupleListToJson
    ( Array.concat
        [ [ Tuple.Tuple "name" (Argonaut.encodeJson (nameToNonEmptyString option.name))
          , Tuple.Tuple "version" (Argonaut.encodeJson option.version)
          , Tuple.Tuple "description" (Argonaut.encodeJson option.description)
          , Tuple.Tuple "repository"
              ( Argonaut.encodeJson
                  { type: "git"
                  , url:
                      String.joinWith
                        ""
                        [ "git+https://github.com/"
                        , NonEmptyString.toString option.gitHubAccountName
                        , "/"
                        , NonEmptyString.toString option.gitHubRepositoryName
                        , ".git"
                        ]
                  }
              )
          , Tuple.Tuple "license" (Argonaut.fromString "MIT")
          , Tuple.Tuple "homepage"
              ( Argonaut.encodeJson
                  (StructuredUrl.toString option.homepage)
              )
          , Tuple.Tuple "author" (Argonaut.encodeJson option.author)
          , Tuple.Tuple "engines"
              ( Util.tupleListToJson
                  ( Array.catMaybes
                      [ case optionalOption.nodeVersion of
                          Just nodeVersion ->
                            Just
                              (Tuple.Tuple "node" (Argonaut.encodeJson nodeVersion))
                          Nothing -> Nothing
                      , case optionalOption.vsCodeVersion of
                          Just vsCodeVersion ->
                            Just
                              (Tuple.Tuple "vscode" (Argonaut.encodeJson vsCodeVersion))
                          Nothing -> Nothing
                      ]
                  )
              )
          , Tuple.Tuple dependenciesPropertyName
              ( Util.tupleListToJson
                  ( map
                      ( \(Tuple.Tuple k v) ->
                          Tuple.Tuple (NonEmptyString.toString k) (Argonaut.encodeJson v)
                      )
                      (Map.toUnfoldable option.dependencies)
                  )
              )
          ]
        , case optionalOption.main of
            Just main -> [ Tuple.Tuple "main" (Argonaut.encodeJson main) ]
            Nothing -> []
        , case optionalOption.typeFilePath of
            Just typeFilePath -> [ Tuple.Tuple "types" (Argonaut.encodeJson typeFilePath) ]
            Nothing -> []
        , case optionalOption.activationEvents of
            Just activationEvents ->
              [ Tuple.Tuple "activationEvents"
                  ( Argonaut.fromArray
                      (map Argonaut.encodeJson activationEvents)
                  )
              ]
            Nothing -> []
        , case optionalOption.contributesLanguages of
            Just contributesLanguages ->
              [ Tuple.Tuple "contributes"
                  (createContributesValue contributesLanguages)
              ]
            Nothing -> []
        , case optionalOption.browser of
            Just browser -> [ Tuple.Tuple "browser" (Argonaut.encodeJson browser) ]
            Nothing -> []
        , case optionalOption.publisher of
            Just publisher -> [ Tuple.Tuple "publisher" (Argonaut.encodeJson publisher) ]
            Nothing -> []
        , case optionalOption.icon of
            Just icon ->
              [ Tuple.Tuple
                  "icon"
                  ( Argonaut.encodeJson
                      ( Path.distributionFilePathToStringBaseAppWithoutDotSlash
                          icon
                          FileType.Png
                      )
                  )
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
createContributesLanguages (ContributesLanguages rec) =
  Argonaut.encodeJson
    { id: rec.id
    , extensions: rec.extensions
    , configuration:
        Path.distributionFilePathToStringBaseApp
          rec.configuration
          FileType.Json
    , icon:
        { dark:
            Path.distributionFilePathToStringBaseApp
              rec.icon.dark
              FileType.Png
        , light:
            Path.distributionFilePathToStringBaseApp
              rec.icon.light
              FileType.Png
        }
    }

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
